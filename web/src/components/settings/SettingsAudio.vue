<template>
  <div class="settings-audio-wrapper">
    <!-- Audio Quality Preferences -->
    <section v-if="can('quality')" class="settings-section">
      <h2 class="section-title">音质偏好</h2>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:music-note-eighth" class="setting-icon" />
          <div>
            <div>网易云音乐音质</div>
            <div style="font-size:12px; opacity:0.6; margin-top:2px">仅对网易云音乐源有效；部分音质需已登录对应等级账号</div>
          </div>
        </div>
        <select v-model="neteaseQuality" class="select" @change="saveNeteaseQuality">
          <option value="standard">标准 (128k)</option>
          <option value="higher">较高 (192k)</option>
          <option value="exhigh">极高 (320k)</option>
          <option value="lossless">无损 (FLAC)</option>
          <option value="hires">Hi-Res</option>
          <option value="jyeffect">高清环绕声</option>
          <option value="sky">沉浸环绕声</option>
          <option value="jymaster">超清母带</option>
        </select>
      </div>

      <div v-if="jellyfinEnabled" class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:server" class="setting-icon" />
          <div>
            <div>Jellyfin 音频流</div>
            <div style="font-size:12px; opacity:0.6; margin-top:2px">直接流式传输原始音频，或由服务端转码为高质量 MP3</div>
          </div>
        </div>
        <select v-model="jellyfinQuality" class="select" @change="saveJellyfinQuality">
          <option value="direct">直接流（原始音频，音质最佳）</option>
          <option value="320">服务端转码 (MP3 320k)</option>
          <option value="192">服务端转码 (MP3 192k)</option>
          <option value="128">服务端转码 (MP3 128k)</option>
        </select>
      </div>
    </section>

    <!-- Behavior & Audio Settings -->
    <section v-if="can('bot.manage')" class="settings-section">
      <h2 class="section-title">行为与音频体验</h2>

      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:timer-off-outline" class="setting-icon" />
          <div>
            <div>闲置自动退出</div>
            <div style="font-size:12px; opacity:0.6; margin-top:2px">服务器上没有其他人时，机器人自动断开的等待时间（0 = 不退出）</div>
          </div>
        </div>
        <div class="prefix-input-wrap">
          <input
            v-model.number="idleTimeout"
            type="number"
            min="0"
            class="input input-sm"
            style="max-width:80px"
            placeholder="0"
          />
          <span style="font-size:13px; opacity:0.7">分钟</span>
          <button class="btn-primary" @click="saveIdleTimeout">保存</button>
        </div>
      </div>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">无人时自动暂停播放</div>
          <div class="profile-toggle-hint">当前频道只剩机器人自己时自动暂停播放，有用户进入当前频道后自动继续播放</div>
        </div>
        <input
          v-model="autoPauseOnEmpty"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveAutoPause"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">语音闪避</div>
          <div class="profile-toggle-hint">检测到其他客户端说话时自动压低音乐音量，说话结束后恢复。默认关闭。</div>
        </div>
        <input
          v-model="voiceDuckingEnabled"
          type="checkbox"
          class="profile-toggle-switch"
          :disabled="voiceDuckingControlsDisabled"
          @change="saveVoiceDucking"
        />
      </label>

      <div class="setting-row voice-ducking-volume">
        <div class="setting-label">
          <Icon icon="mdi:volume-minus" class="setting-icon" />
          <div>
            <div>说话时保留原音量</div>
            <div class="voice-ducking-hint">例如设为 30%，有人说话时音乐将降至原音量的 30%。</div>
          </div>
        </div>
        <div class="voice-ducking-controls">
          <input
            v-model.number="voiceDuckingVolumePercent"
            type="range"
            min="0"
            max="100"
            step="0.1"
            class="voice-ducking-range"
            :disabled="voiceDuckingControlsDisabled"
            aria-label="说话时保留原音量百分比"
          />
          <div class="prefix-input-wrap">
            <input
              v-model.number="voiceDuckingVolumePercent"
              type="number"
              min="0"
              max="100"
              step="0.1"
              class="input input-sm"
              style="max-width:80px"
              :disabled="voiceDuckingControlsDisabled"
              aria-label="说话时保留原音量百分比"
              @blur="normalizeVoiceDuckingVolume"
            />
            <span class="voice-ducking-unit">%</span>
            <button class="btn-primary" :disabled="voiceDuckingControlsDisabled" @click="saveVoiceDucking">
              {{ !voiceDuckingLoaded ? '加载设置…' : voiceDuckingSaving ? '保存中…' : '保存比例' }}
            </button>
          </div>
        </div>
        <p
          v-if="voiceDuckingMessage"
          class="voice-ducking-message"
          :class="`tone-${voiceDuckingMessageTone}`"
          :role="voiceDuckingMessageTone === 'warn' ? 'alert' : 'status'"
          :aria-live="voiceDuckingMessageTone === 'warn' ? 'assertive' : 'polite'"
          aria-atomic="true"
        >
          {{ voiceDuckingMessage }}
        </p>
      </div>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">智能动态音量均衡</div>
          <div class="profile-toggle-hint">使用 FFmpeg dynaudnorm 滤镜动态平滑不同平台与曲目的音量差异，防止切歌爆音或声音忽大忽小。默认开启。</div>
        </div>
        <input
          v-model="loudnessNormalization"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveLoudnessNormalization"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">切歌平滑淡入淡出</div>
          <div class="profile-toggle-hint">起播、切歌、暂停与恢复时应用 300~400ms 音量平滑渐变，告别生硬爆音与突兀断音。默认开启。</div>
        </div>
        <input
          v-model="audioFade"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveAudioFade"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">无版权 / VIP 灰歌自动备用换源</div>
          <div class="profile-toggle-hint">当歌曲在原平台无版权、需要 VIP 无法试听完整版时，自动在其他已启用的音源（QQ/网易/酷狗/B站/YouTube）智能检索替代播放。默认开启。</div>
        </div>
        <input
          v-model="autoSourceFallback"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveAutoSourceFallback"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">本地音频播放</div>
          <div class="profile-toggle-hint">开启后允许在搜索页拖拽/选择本地音频上传并播放；关闭后会拒绝新的本地上传和本地歌曲播放请求。</div>
        </div>
        <input
          v-model="localAudioEnabled"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveLocalAudioEnabled"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">保存/加载播放清单（含重启后自动恢复队列）</div>
          <div class="profile-toggle-hint">开启后可在网页与聊天命令（!save / !load / !queues）保存和加载播放清单，并在机器人重启后自动恢复并继续播放上次的队列。重启只能从当前曲目的开头恢复（不记忆进度）；Spotify 恢复为尽力而为。默认关闭。</div>
        </div>
        <input
          v-model="savedQueuesEnabled"
          type="checkbox"
          class="profile-toggle-switch"
          @change="saveSavedQueuesEnabled"
        />
      </label>

      <label class="profile-toggle behavior-toggle">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">直接播放单曲时不清空队列</div>
          <div class="profile-toggle-hint">开启后，直接播放单曲会插入到当前歌曲之后并立即播放，播完继续原队列，而不是清空整个队列。仅影响单曲的「直接播放」；歌单/专辑/电台仍会替换队列。默认关闭。</div>
        </div>
        <input
          v-model="playKeepsQueue"
          type="checkbox"
          class="profile-toggle-switch"
          @change="savePlayKeepsQueue"
        />
      </label>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import { usePlayerStore } from '../../stores/player';
import { useSession } from '../../composables/useSession.js';

const store = usePlayerStore();
const session = useSession();
const { can } = session;

// Audio Quality
const neteaseQuality = ref('exhigh');
const jellyfinQuality = ref('direct');
const jellyfinEnabled = ref(false);

// Behavior & Audio
const idleTimeout = ref(0);
const autoPauseOnEmpty = ref(false);
const voiceDuckingEnabled = ref(false);
const voiceDuckingVolumePercent = ref(30);
const voiceDuckingLoaded = ref(false);
const voiceDuckingSaving = ref(false);
const voiceDuckingControlsDisabled = computed(
  () => !voiceDuckingLoaded.value || voiceDuckingSaving.value,
);
const voiceDuckingMessage = ref('');
const voiceDuckingMessageTone = ref<'ok' | 'warn'>('ok');
let savedVoiceDucking = { enabled: false, volumePercent: 30 };
let voiceDuckingRequestRevision = 0;

const localAudioEnabled = ref(true);
const savedQueuesEnabled = ref(false);
const playKeepsQueue = ref(false);
const loudnessNormalization = ref(true);
const audioFade = ref(true);
const autoSourceFallback = ref(true);

function normalizeVoiceDuckingVolume(): number {
  const raw = voiceDuckingVolumePercent.value as number | string;
  const value = raw === '' ? Number.NaN : Number(raw);
  voiceDuckingVolumePercent.value = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : savedVoiceDucking.volumePercent;
  return voiceDuckingVolumePercent.value;
}

function applyVoiceDuckingConfig(config: unknown) {
  if (!config || typeof config !== 'object') return;
  const value = config as { enabled?: unknown; volumePercent?: unknown };
  voiceDuckingEnabled.value = typeof value.enabled === 'boolean' ? value.enabled : false;
  const percent = value.volumePercent;
  voiceDuckingVolumePercent.value = typeof percent === 'number' && Number.isFinite(percent)
    ? Math.min(100, Math.max(0, percent))
    : 30;
  savedVoiceDucking = {
    enabled: voiceDuckingEnabled.value,
    volumePercent: voiceDuckingVolumePercent.value,
  };
}

async function loadSettings() {
  const voiceDuckingLoadRevision = voiceDuckingRequestRevision;
  try {
    const res = await axios.get('/api/bot/settings');
    idleTimeout.value = res.data.idleTimeoutMinutes ?? 0;
    autoPauseOnEmpty.value = res.data.autoPauseOnEmpty ?? false;
    if (voiceDuckingLoadRevision === voiceDuckingRequestRevision) {
      applyVoiceDuckingConfig(res.data.voiceDucking ?? { enabled: false, volumePercent: 30 });
      voiceDuckingLoaded.value = true;
      voiceDuckingMessage.value = '';
    }
    localAudioEnabled.value = res.data.localAudioEnabled ?? true;
    savedQueuesEnabled.value = res.data.savedQueuesEnabled ?? false;
    playKeepsQueue.value = res.data.playKeepsQueue ?? false;
    loudnessNormalization.value = res.data.loudnessNormalization ?? true;
    audioFade.value = res.data.audioFade ?? true;
    autoSourceFallback.value = res.data.autoSourceFallback ?? true;
    store.savedQueuesEnabled = savedQueuesEnabled.value;

    if (Array.isArray(res.data.enabledProviders)) {
      jellyfinEnabled.value = res.data.enabledProviders.includes('jellyfin');
    }
  } catch {
    if (!voiceDuckingLoaded.value) {
      voiceDuckingMessageTone.value = 'warn';
      voiceDuckingMessage.value = '设置加载失败，请刷新重试';
    }
  }

  // Load provider quality
  try {
    const qRes = await axios.get('/api/provider/quality');
    neteaseQuality.value = qRes.data?.netease ?? 'exhigh';
    jellyfinQuality.value = qRes.data?.jellyfin ?? 'direct';
  } catch {
    store.notify('音质设置加载失败', 'error');
  }
}

async function saveNeteaseQuality() {
  try {
    await axios.post('/api/provider/quality', { platform: 'netease', quality: neteaseQuality.value });
  } catch {
    store.notify('网易云音质保存失败', 'error');
  }
}

async function saveJellyfinQuality() {
  try {
    await axios.post('/api/provider/quality', { platform: 'jellyfin', quality: jellyfinQuality.value });
  } catch {
    store.notify('Jellyfin 音质保存失败', 'error');
  }
}

async function saveIdleTimeout() {
  try {
    await axios.post('/api/bot/settings', { idleTimeoutMinutes: idleTimeout.value });
  } catch {
    store.notify('闲置退出设置保存失败', 'error');
  }
}

async function saveAutoPause() {
  try {
    await axios.post('/api/bot/settings', { autoPauseOnEmpty: autoPauseOnEmpty.value });
  } catch {
    store.notify('自动暂停设置保存失败', 'error');
  }
}

async function saveVoiceDucking() {
  if (!voiceDuckingLoaded.value || voiceDuckingSaving.value) return;
  voiceDuckingSaving.value = true;
  voiceDuckingRequestRevision++;
  voiceDuckingMessage.value = '';
  const submitted = {
    enabled: voiceDuckingEnabled.value,
    volumePercent: normalizeVoiceDuckingVolume(),
  };
  try {
    const res = await axios.post('/api/bot/settings', { voiceDucking: submitted });
    applyVoiceDuckingConfig(res.data?.voiceDucking ?? submitted);
    voiceDuckingMessageTone.value = 'ok';
    voiceDuckingMessage.value = '已保存';
  } catch {
    applyVoiceDuckingConfig(savedVoiceDucking);
    voiceDuckingMessageTone.value = 'warn';
    voiceDuckingMessage.value = '保存失败，请稍后重试';
  } finally {
    voiceDuckingSaving.value = false;
  }
}

async function saveLocalAudioEnabled() {
  try {
    const res = await axios.post('/api/bot/settings', { localAudioEnabled: localAudioEnabled.value });
    localAudioEnabled.value = res.data.localAudioEnabled ?? localAudioEnabled.value;
  } catch {
    store.notify('本地音频设置保存失败', 'error');
  }
}

async function saveSavedQueuesEnabled() {
  try {
    const res = await axios.post('/api/bot/settings', { savedQueuesEnabled: savedQueuesEnabled.value });
    savedQueuesEnabled.value = res.data.savedQueuesEnabled ?? savedQueuesEnabled.value;
    store.savedQueuesEnabled = savedQueuesEnabled.value;
  } catch {
    store.notify('保存队列设置失败', 'error');
  }
}

async function savePlayKeepsQueue() {
  try {
    const res = await axios.post('/api/bot/settings', { playKeepsQueue: playKeepsQueue.value });
    playKeepsQueue.value = res.data.playKeepsQueue ?? playKeepsQueue.value;
  } catch {
    store.notify('播放队列设置保存失败', 'error');
  }
}

async function saveLoudnessNormalization() {
  try {
    const res = await axios.post('/api/bot/settings', { loudnessNormalization: loudnessNormalization.value });
    loudnessNormalization.value = res.data.loudnessNormalization ?? loudnessNormalization.value;
  } catch {
    store.notify('动态音量均衡设置保存失败', 'error');
  }
}

async function saveAudioFade() {
  try {
    const res = await axios.post('/api/bot/settings', { audioFade: audioFade.value });
    audioFade.value = res.data.audioFade ?? audioFade.value;
  } catch {
    store.notify('淡入淡出设置保存失败', 'error');
  }
}

async function saveAutoSourceFallback() {
  try {
    const res = await axios.post('/api/bot/settings', { autoSourceFallback: autoSourceFallback.value });
    autoSourceFallback.value = res.data.autoSourceFallback ?? autoSourceFallback.value;
  } catch {
    store.notify('备用音源设置保存失败', 'error');
  }
}

onMounted(() => {
  loadSettings();
});
</script>
