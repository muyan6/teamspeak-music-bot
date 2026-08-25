<template>
  <div class="settings-sources-wrapper">
    <!-- Jellyfin Settings -->
    <section v-if="can('platform.auth')" class="settings-section">
      <h2 class="section-title">Jellyfin 音乐库</h2>
      <p class="profile-section-hint">连接自建 Jellyfin / Emby 媒体库。勾选启用后，音乐库页面将提供 Jellyfin 独立标签；搜索与电台也会包含该源。</p>

      <label class="profile-toggle behavior-toggle" style="margin-bottom: 16px">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">启用 Jellyfin 音乐源</div>
          <div class="profile-toggle-hint">关闭后，Jellyfin 音乐库在左侧导航与源切换中隐藏，不参与搜索与电台。</div>
        </div>
        <input
          v-model="jellyfinEnabledForm"
          type="checkbox"
          class="profile-toggle-switch"
        />
      </label>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:server-network" class="setting-icon" />
          <div>
            <div>服务器地址</div>
            <div style="font-size:12px; opacity:0.6; margin-top:2px">例如 http://192.168.1.100:8096 或 https://jellyfin.example.com</div>
          </div>
        </div>
        <input v-model="jellyfinForm.serverUrl" type="url" class="input" style="max-width:320px" placeholder="http://ip:8096" />
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:shield-key-outline" class="setting-icon" />
          <div>认证方式</div>
        </div>
        <select v-model="jellyfinForm.authMode" class="select">
          <option value="userpass">账号密码认证（推荐）</option>
          <option value="apikey">API Key 认证</option>
        </select>
      </div>

      <template v-if="jellyfinForm.authMode === 'userpass'">
        <div class="setting-row">
          <div class="setting-label">
            <Icon icon="mdi:account" class="setting-icon" />
            <div>用户名</div>
          </div>
          <input v-model="jellyfinForm.username" type="text" class="input" style="max-width:240px" placeholder="用户名" />
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <Icon icon="mdi:lock" class="setting-icon" />
            <div>密码</div>
          </div>
          <input v-model="jellyfinForm.password" type="password" class="input" style="max-width:240px" :placeholder="jellyfinHasSecret ? '••••••••（留空保持不变）' : '密码'" />
        </div>
      </template>

      <template v-else>
        <div class="setting-row">
          <div class="setting-label">
            <Icon icon="mdi:key" class="setting-icon" />
            <div>API Key</div>
          </div>
          <input v-model="jellyfinForm.apiKey" type="password" class="input" style="max-width:320px" :placeholder="jellyfinHasSecret ? '••••••••（留空保持不变）' : '在 Jellyfin 控制台生成'" />
        </div>
        <div class="setting-row">
          <div class="setting-label">
            <Icon icon="mdi:account-outline" class="setting-icon" />
            <div>用户 ID（可选）</div>
          </div>
          <input v-model="jellyfinForm.userId" type="text" class="input" style="max-width:320px" placeholder="用于同步播放列表和偏好" />
        </div>
      </template>

      <div class="setting-actions-row">
        <button class="btn-sm" :disabled="jellyfinTesting || !jellyfinForm.serverUrl" @click="testJellyfin">
          {{ jellyfinTesting ? '测试中…' : '测试连接' }}
        </button>
        <button class="btn-sm btn-primary" :disabled="jellyfinSaving" @click="saveJellyfin">
          {{ jellyfinSaving ? '保存中…' : '保存设置' }}
        </button>
        <span v-if="jellyfinMessage" class="setting-msg" :class="`tone-${jellyfinMessageTone}`">{{ jellyfinMessage }}</span>
      </div>
    </section>

    <!-- Platform Login (QR / Cookie) -->
    <section v-if="can('platform.auth')" class="settings-section">
      <h2 class="section-title">音乐平台登录</h2>
      <p class="profile-section-hint">登录平台账号以解锁高音质及会员歌曲播放（支持网易云、QQ音乐、B站、酷狗）。</p>

      <div class="platform-auth-grid">
        <!-- NetEase -->
        <div class="platform-auth-card">
          <div class="platform-auth-header">
            <div class="platform-auth-name">
              <Icon icon="ri:netease-cloud-music-fill" class="platform-icon netease" />
              网易云音乐
            </div>
            <span class="platform-status-badge" :class="{ ok: authStatus.netease?.loggedIn }">
              {{ authStatus.netease?.loggedIn ? (authStatus.netease.nickname || '已登录') : '未登录' }}
            </span>
          </div>
          <div class="platform-auth-actions">
            <template v-if="!authStatus.netease?.loggedIn">
              <button class="btn-sm btn-primary" @click="openQrModal('netease')">扫码登录</button>
              <button class="btn-sm" @click="openCookieModal('netease')">Cookie 登录</button>
            </template>
            <template v-else>
              <button class="btn-sm btn-delete" @click="logoutPlatform('netease')">退出登录</button>
            </template>
          </div>
        </div>

        <!-- QQ Music -->
        <div class="platform-auth-card">
          <div class="platform-auth-header">
            <div class="platform-auth-name">
              <Icon icon="simple-icons:qq" class="platform-icon qq" />
              QQ 音乐
            </div>
            <span class="platform-status-badge" :class="{ ok: authStatus.qq?.loggedIn }">
              {{ authStatus.qq?.loggedIn ? (authStatus.qq.nickname || '已登录') : '未登录' }}
            </span>
          </div>
          <div class="platform-auth-actions">
            <template v-if="!authStatus.qq?.loggedIn">
              <button class="btn-sm btn-primary" @click="openQrModal('qq')">扫码登录</button>
              <button class="btn-sm" @click="openCookieModal('qq')">Cookie 登录</button>
            </template>
            <template v-else>
              <button class="btn-sm btn-delete" @click="logoutPlatform('qq')">退出登录</button>
            </template>
          </div>
        </div>

        <!-- Bilibili -->
        <div class="platform-auth-card">
          <div class="platform-auth-header">
            <div class="platform-auth-name">
              <Icon icon="ri:bilibili-fill" class="platform-icon bilibili" />
              哔哩哔哩
            </div>
            <span class="platform-status-badge" :class="{ ok: authStatus.bilibili?.loggedIn }">
              {{ authStatus.bilibili?.loggedIn ? (authStatus.bilibili.nickname || '已登录') : '未登录' }}
            </span>
          </div>
          <div class="platform-auth-actions">
            <template v-if="!authStatus.bilibili?.loggedIn">
              <button class="btn-sm btn-primary" @click="openQrModal('bilibili')">扫码登录</button>
              <button class="btn-sm" @click="openCookieModal('bilibili')">Cookie 登录</button>
            </template>
            <template v-else>
              <button class="btn-sm btn-delete" @click="logoutPlatform('bilibili')">退出登录</button>
            </template>
          </div>
        </div>

        <!-- Kugou -->
        <div class="platform-auth-card">
          <div class="platform-auth-header">
            <div class="platform-auth-name">
              <Icon icon="mdi:music-circle" class="platform-icon kugou" />
              酷狗音乐
            </div>
            <span class="platform-status-badge" :class="{ ok: authStatus.kugou?.loggedIn }">
              {{ authStatus.kugou?.loggedIn ? (authStatus.kugou.nickname || '已登录') : '未登录' }}
            </span>
          </div>
          <div class="platform-auth-actions">
            <template v-if="!authStatus.kugou?.loggedIn">
              <button class="btn-sm btn-primary" @click="openQrModal('kugou')">扫码登录</button>
              <button class="btn-sm" @click="openCookieModal('kugou')">Cookie 登录</button>
            </template>
            <template v-else>
              <button class="btn-sm btn-delete" @click="logoutPlatform('kugou')">退出登录</button>
            </template>
          </div>
        </div>
      </div>
    </section>

    <!-- Default Source Preference -->
    <section v-if="can('bot.manage')" class="settings-section">
      <h2 class="section-title">默认音源偏好</h2>
      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:tune-vertical" class="setting-icon" />
          <div>
            <div>全局默认搜索与点歌音源</div>
            <div style="font-size:12px; opacity:0.6; margin-top:2px">当点歌或搜索命令未指定平台时使用的默认音源</div>
          </div>
        </div>
        <select v-model="defaultPlatformForm" class="select" @change="saveDefaultPlatform">
          <option value="">自动（按系统默认优先级）</option>
          <option value="netease">网易云音乐</option>
          <option value="qq">QQ 音乐</option>
          <option value="kugou">酷狗音乐</option>
          <option value="bilibili">哔哩哔哩</option>
          <option value="youtube">YouTube</option>
          <option v-if="jellyfinEnabledForm" value="jellyfin">Jellyfin 音乐库</option>
        </select>
      </div>
    </section>

    <!-- Spotify Connect Integration -->
    <section v-if="can('platform.auth')" class="settings-section">
      <h2 class="section-title">Spotify (Connect)</h2>
      <p class="profile-section-hint">配置 Spotify 开发者应用凭据以开启 Spotify 歌曲与歌单解析播放。</p>

      <label class="profile-toggle behavior-toggle" style="margin-bottom: 16px">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">启用 Spotify 歌曲源</div>
          <div class="profile-toggle-hint">开启后支持解析 spotify.com 链接与 URI 进行点歌与播歌。</div>
        </div>
        <input
          v-model="spotifyForm.enabled"
          type="checkbox"
          class="profile-toggle-switch"
        />
      </label>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:spotify" class="setting-icon" />
          <div>Client ID</div>
        </div>
        <input v-model="spotifyForm.clientId" type="text" class="input" style="max-width:320px" placeholder="Spotify 开发者 Client ID" />
      </div>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:key-outline" class="setting-icon" />
          <div>Client Secret</div>
        </div>
        <input v-model="spotifyForm.clientSecret" type="password" class="input" style="max-width:320px" :placeholder="spotifyHasSecret ? '••••••••（留空保持不变）' : 'Spotify 开发者 Client Secret'" />
      </div>

      <div class="setting-actions-row">
        <button class="btn-sm btn-primary" :disabled="spotifySaving" @click="saveSpotify">
          {{ spotifySaving ? '保存中…' : '保存 Spotify 设置' }}
        </button>
        <span v-if="spotifyMessage" class="setting-msg" :class="`tone-${spotifyMessageTone}`">{{ spotifyMessage }}</span>
      </div>
    </section>

    <!-- QR Modal -->
    <div v-if="qrModalPlatform" class="edit-modal-overlay" @click.self="closeQrModal">
      <div class="edit-modal" style="max-width:360px; text-align:center">
        <h3 class="modal-title">扫码登录 {{ platformDisplayName(qrModalPlatform) }}</h3>
        <div v-if="qrCodeImg" class="qr-container" style="margin:20px 0">
          <img :src="qrCodeImg" alt="QR Code" style="width:200px; height:200px; border-radius:8px" />
        </div>
        <p v-if="qrStatusMsg" class="qr-status-msg" style="font-size:14px; opacity:0.8">{{ qrStatusMsg }}</p>
        <div class="modal-actions" style="justify-content:center; margin-top:20px">
          <button class="btn-sm" @click="closeQrModal">关闭</button>
        </div>
      </div>
    </div>

    <!-- Cookie Modal -->
    <div v-if="cookieModalPlatform" class="edit-modal-overlay" @click.self="cookieModalPlatform = null">
      <div class="edit-modal" style="max-width:480px">
        <h3 class="modal-title">填写 Cookie ({{ platformDisplayName(cookieModalPlatform) }})</h3>
        <p style="font-size:13px; opacity:0.7; margin-bottom:12px">请从浏览器开发者工具中复制该平台的完整 Cookie 字符串。</p>
        <textarea v-model="cookieInput" class="input" style="width:100%; height:120px; resize:vertical" placeholder="MUSIC_U=... / SESSDATA=..."></textarea>
        <div class="modal-actions" style="margin-top:16px">
          <button class="btn-sm" @click="cookieModalPlatform = null">取消</button>
          <button class="btn-sm btn-primary" :disabled="!cookieInput.trim()" @click="submitCookie">保存 Cookie</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import { usePlayerStore } from '../../stores/player';
import { useSession } from '../../composables/useSession.js';

const store = usePlayerStore();
const session = useSession();
const { can } = session;

// Jellyfin
const jellyfinEnabledForm = ref(false);
const jellyfinHasSecret = ref(false);
const jellyfinTesting = ref(false);
const jellyfinSaving = ref(false);
const jellyfinMessage = ref('');
const jellyfinMessageTone = ref<'ok' | 'warn'>('ok');
const jellyfinForm = reactive({
  serverUrl: '',
  authMode: 'userpass',
  username: '',
  password: '',
  apiKey: '',
  userId: '',
});

// Platform Auth status
const authStatus = reactive<Record<string, { loggedIn: boolean; nickname?: string }>>({
  netease: { loggedIn: false },
  qq: { loggedIn: false },
  bilibili: { loggedIn: false },
  kugou: { loggedIn: false },
});

// Default Platform
const defaultPlatformForm = ref('');

// Spotify
const spotifyForm = reactive({
  enabled: false,
  clientId: '',
  clientSecret: '',
});
const spotifyHasSecret = ref(false);
const spotifySaving = ref(false);
const spotifyMessage = ref('');
const spotifyMessageTone = ref<'ok' | 'warn'>('ok');

// Modals
const qrModalPlatform = ref<string | null>(null);
const qrCodeImg = ref('');
const qrStatusMsg = ref('');
let qrPollTimer: ReturnType<typeof setInterval> | null = null;
const cookieModalPlatform = ref<string | null>(null);
const cookieInput = ref('');

function platformDisplayName(p: string) {
  switch (p) {
    case 'netease': return '网易云音乐';
    case 'qq': return 'QQ 音乐';
    case 'bilibili': return '哔哩哔哩';
    case 'kugou': return '酷狗音乐';
    default: return p;
  }
}

async function checkAuthStatus() {
  try {
    const res = await axios.get('/api/auth/status');
    if (res.data) {
      Object.assign(authStatus, res.data);
    }
  } catch {
    store.notify('平台登录状态加载失败', 'error');
  }
}

async function loadSourcesSettings() {
  try {
    const res = await axios.get('/api/bot/settings');
    defaultPlatformForm.value = res.data.defaultPlatform ?? '';

    if (res.data.jellyfin) {
      jellyfinForm.serverUrl = res.data.jellyfin.serverUrl ?? '';
      jellyfinForm.authMode = res.data.jellyfin.authMode ?? 'userpass';
      jellyfinForm.username = res.data.jellyfin.username ?? '';
      jellyfinForm.userId = res.data.jellyfin.userId ?? '';
      jellyfinHasSecret.value = Boolean(res.data.jellyfin.hasPassword || res.data.jellyfin.hasApiKey);
    }
    if (Array.isArray(res.data.enabledProviders)) {
      jellyfinEnabledForm.value = res.data.enabledProviders.includes('jellyfin');
    }
    if (res.data.spotify) {
      spotifyForm.enabled = Boolean(res.data.spotify.enabled);
      spotifyForm.clientId = res.data.spotify.clientId ?? '';
      spotifyHasSecret.value = Boolean(res.data.spotify.hasClientSecret);
    }
  } catch {
    store.notify('音源设置加载失败', 'error');
  }
}

async function testJellyfin() {
  jellyfinTesting.value = true;
  jellyfinMessage.value = '';
  try {
    const res = await axios.post('/api/jellyfin/test', jellyfinForm);
    if (res.data?.success) {
      jellyfinMessageTone.value = 'ok';
      jellyfinMessage.value = `连接成功 (${res.data.serverName || 'Jellyfin'})`;
    } else {
      jellyfinMessageTone.value = 'warn';
      jellyfinMessage.value = res.data?.error || '连接失败';
    }
  } catch (err: any) {
    jellyfinMessageTone.value = 'warn';
    jellyfinMessage.value = err?.response?.data?.error || '连接失败';
  } finally {
    jellyfinTesting.value = false;
  }
}

async function saveJellyfin() {
  jellyfinSaving.value = true;
  jellyfinMessage.value = '';
  try {
    await axios.post('/api/bot/settings', {
      jellyfin: jellyfinForm,
    });
    jellyfinMessageTone.value = 'ok';
    jellyfinMessage.value = '已保存';
    await loadSourcesSettings();
  } catch {
    jellyfinMessageTone.value = 'warn';
    jellyfinMessage.value = '保存失败';
  } finally {
    jellyfinSaving.value = false;
  }
}

async function saveDefaultPlatform() {
  try {
    await axios.post('/api/bot/settings', {
      defaultPlatform: defaultPlatformForm.value || null,
    });
  } catch {
    store.notify('默认音源保存失败', 'error');
  }
}

async function saveSpotify() {
  spotifySaving.value = true;
  spotifyMessage.value = '';
  try {
    await axios.post('/api/bot/settings', {
      spotify: spotifyForm,
    });
    spotifyMessageTone.value = 'ok';
    spotifyMessage.value = '已保存';
  } catch {
    spotifyMessageTone.value = 'warn';
    spotifyMessage.value = '保存失败';
  } finally {
    spotifySaving.value = false;
  }
}

async function openQrModal(platform: string) {
  qrModalPlatform.value = platform;
  qrCodeImg.value = '';
  qrStatusMsg.value = '正在获取二维码…';
  try {
    const res = await axios.post(`/api/auth/qr/key`, { platform });
    const key = res.data?.key;
    if (!key) throw new Error('No key');
    const qrRes = await axios.post(`/api/auth/qr/create`, { platform, key });
    qrCodeImg.value = qrRes.data?.qrimg || '';
    qrStatusMsg.value = '请使用对应手机 App 扫码';

    if (qrPollTimer) clearInterval(qrPollTimer);
    qrPollTimer = setInterval(async () => {
      try {
        const checkRes = await axios.post(`/api/auth/qr/check`, { platform, key });
        if (checkRes.data?.code === 803 || checkRes.data?.success) {
          qrStatusMsg.value = '登录成功！';
          closeQrModal();
          await checkAuthStatus();
        } else if (checkRes.data?.message) {
          qrStatusMsg.value = checkRes.data.message;
        }
      } catch {
        store.notify('二维码登录状态检查失败', 'error');
      }
    }, 2500);
  } catch {
    qrStatusMsg.value = '获取二维码失败';
  }
}

function closeQrModal() {
  qrModalPlatform.value = null;
  if (qrPollTimer) {
    clearInterval(qrPollTimer);
    qrPollTimer = null;
  }
}

function openCookieModal(platform: string) {
  cookieModalPlatform.value = platform;
  cookieInput.value = '';
}

async function submitCookie() {
  if (!cookieModalPlatform.value || !cookieInput.value.trim()) return;
  try {
    await axios.post('/api/auth/cookie', {
      platform: cookieModalPlatform.value,
      cookie: cookieInput.value.trim(),
    });
    cookieModalPlatform.value = null;
    await checkAuthStatus();
  } catch {
    alert('保存 Cookie 失败');
  }
}

async function logoutPlatform(platform: string) {
  if (!confirm(`确认退出 ${platformDisplayName(platform)} 登录？`)) return;
  try {
    await axios.post(`/api/auth/logout`, { platform });
    await checkAuthStatus();
  } catch {
    store.notify('平台退出登录失败', 'error');
  }
}

onMounted(() => {
  loadSourcesSettings();
  checkAuthStatus();
});

onUnmounted(() => {
  if (qrPollTimer) clearInterval(qrPollTimer);
});
</script>

<style scoped>
.platform-auth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.platform-auth-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.platform-auth-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.platform-auth-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
}
.platform-icon {
  font-size: 20px;
}
.platform-icon.netease { color: #e60026; }
.platform-icon.qq { color: #31c27c; }
.platform-icon.bilibili { color: #00a1d6; }
.platform-icon.kugou { color: #0088ff; }
.platform-status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}
.platform-status-badge.ok {
  background: rgba(46, 213, 115, 0.15);
  color: #2ed573;
}
.platform-auth-actions {
  display: flex;
  gap: 8px;
}
.setting-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.setting-msg {
  font-size: 13px;
}
.setting-msg.tone-ok { color: #2ed573; }
.setting-msg.tone-warn { color: #ff4757; }
</style>
