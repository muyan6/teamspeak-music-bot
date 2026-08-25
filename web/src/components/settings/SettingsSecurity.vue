<template>
  <div class="settings-security-wrapper">
    <!-- Admin TS Server Groups -->
    <section v-if="session.isAdmin.value" class="settings-section">
      <h2 class="section-title">TeamSpeak 管理员服务器组</h2>
      <p class="profile-section-hint">属于以下服务器组的 TeamSpeak 客户端拥有机器人的全部聊天控制权限（如 !mode、!volume 等）。</p>
      <div class="setting-row">
        <div class="setting-label">
          <Icon icon="mdi:account-group" class="setting-icon" />
          <div>服务器组 ID（多个用英文逗号隔开）</div>
        </div>
        <input v-model="adminGroupsInput" type="text" class="input" style="max-width:240px" placeholder="如 6, 7" />
      </div>
      <div class="setting-actions-row">
        <button class="btn-sm btn-primary" :disabled="adminGroupsSaving" @click="saveAdminGroups">
          {{ adminGroupsSaving ? '保存中…' : '保存服务器组' }}
        </button>
        <span v-if="adminGroupsMessage" class="setting-msg" :class="`tone-${adminGroupsMessageTone}`">{{ adminGroupsMessage }}</span>
      </div>
    </section>

    <!-- Guest Mode Configuration -->
    <section v-if="session.isAdmin.value" class="settings-section">
      <h2 class="section-title">游客模式</h2>
      <p class="profile-section-hint">开启后，访客无需登录即可进入 Web 界面并点歌（默认关闭）。游客无法查看或修改设置。</p>

      <label class="profile-toggle behavior-toggle" style="margin-bottom: 16px">
        <div class="profile-toggle-text">
          <div class="profile-toggle-label">开启游客访问</div>
          <div class="profile-toggle-hint">允许未登录用户访问 Web 控制台</div>
        </div>
        <input
          v-model="guestModeForm.enabled"
          type="checkbox"
          class="profile-toggle-switch"
        />
      </label>

      <div v-if="guestModeForm.enabled" class="guest-permissions-block">
        <h4 style="margin: 12px 0 8px; font-size: 14px">游客可用功能权限</h4>
        <div class="permission-checkboxes">
          <label class="perm-checkbox">
            <input v-model="guestModeForm.permissions.play" type="checkbox" />
            <span>点歌播放 (play)</span>
          </label>
          <label class="perm-checkbox">
            <input v-model="guestModeForm.permissions.control" type="checkbox" />
            <span>播控与切歌 (control)</span>
          </label>
          <label class="perm-checkbox">
            <input v-model="guestModeForm.permissions.queue" type="checkbox" />
            <span>调整播放队列 (queue)</span>
          </label>
          <label class="perm-checkbox">
            <input v-model="guestModeForm.permissions.volume" type="checkbox" />
            <span>调节音量 (volume)</span>
          </label>
        </div>
      </div>

      <div class="setting-actions-row" style="margin-top: 16px">
        <button class="btn-sm btn-primary" :disabled="guestModeSaving" @click="saveGuestMode">
          {{ guestModeSaving ? '保存中…' : '保存游客模式设置' }}
        </button>
        <span v-if="guestModeMessage" class="setting-msg" :class="`tone-${guestModeMessageTone}`">{{ guestModeMessage }}</span>
      </div>
    </section>

    <!-- User Accounts Management -->
    <section v-if="session.isAdmin.value" class="settings-section">
      <h2 class="section-title">用户账号管理</h2>

      <div class="user-list-toolbar" style="margin-bottom: 16px; display: flex; justify-content: flex-end">
        <button class="btn-sm btn-primary" @click="openCreateUserModal">
          <Icon icon="mdi:account-plus" />
          创建新用户
        </button>
      </div>

      <div class="user-table-wrap">
        <table class="user-table">
          <thead>
            <tr>
              <th>用户名</th>
              <th>角色</th>
              <th>可管理机器人</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in userList" :key="u.id">
              <td>{{ u.username }}</td>
              <td>
                <span class="user-role-badge" :class="`role-${u.role}`">
                  {{ u.role === 'admin' ? '管理员' : '成员' }}
                </span>
              </td>
              <td>{{ u.bots === 'all' ? '全部' : `${(u.bots || []).length} 个` }}</td>
              <td>{{ formatDate(u.createdAt) }}</td>
              <td>
                <button class="btn-sm btn-delete" :disabled="u.id === session.currentUser.value?.id" @click="deleteUser(u)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Audit Logs -->
    <section v-if="session.isAdmin.value" class="settings-section">
      <h2 class="section-title">安全审计日志</h2>
      <p class="profile-section-hint">记录最近的关键安全操作（登录、密码更改、用户增删等）。</p>

      <div class="audit-logs-wrap" style="margin-top: 16px">
        <div class="audit-logs-toolbar" style="margin-bottom: 12px; display: flex; gap: 8px">
          <button class="btn-sm" :disabled="loadingLogs" @click="loadAuditLogs">刷新日志</button>
        </div>

        <table class="user-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>操作人</th>
              <th>操作行为</th>
              <th>目标</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in auditLogs" :key="log.id">
              <td>{{ formatDate(log.createdAt) }}</td>
              <td>{{ log.actorUsername || '系统' }}</td>
              <td>{{ log.action }}</td>
              <td>{{ log.target || '—' }}</td>
              <td>
                <span class="status-indicator" :class="log.success ? 'ok' : 'fail'">
                  {{ log.success ? '成功' : '失败' }}
                </span>
              </td>
            </tr>
            <tr v-if="auditLogs.length === 0">
              <td colspan="5" style="text-align:center; opacity:0.6">暂无审计日志记录</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Create User Modal -->
    <div v-if="showCreateUserModal" class="edit-modal-overlay" @click.self="showCreateUserModal = false">
      <div class="edit-modal" style="max-width:400px">
        <h3 class="modal-title">创建新用户</h3>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="newUserForm.username" type="text" class="input" required />
        </div>
        <div class="form-group">
          <label>密码 (≥8 位)</label>
          <input v-model="newUserForm.password" type="password" minlength="8" class="input" required />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="newUserForm.role" class="select">
            <option value="member">普通成员 (member)</option>
            <option value="admin">系统管理员 (admin)</option>
          </select>
        </div>
        <div class="modal-actions" style="margin-top: 20px">
          <button class="btn-sm" @click="showCreateUserModal = false">取消</button>
          <button class="btn-sm btn-primary" :disabled="creatingUser" @click="submitCreateUser">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import { usePlayerStore } from '../../stores/player';
import { useSession } from '../../composables/useSession.js';

const store = usePlayerStore();
const session = useSession();

// Admin Server Groups
const adminGroupsInput = ref('');
const adminGroupsSaving = ref(false);
const adminGroupsMessage = ref('');
const adminGroupsMessageTone = ref<'ok' | 'warn'>('ok');

// Guest Mode
const guestModeForm = reactive({
  enabled: false,
  permissions: {
    play: true,
    control: true,
    queue: true,
    volume: false,
  },
});
const guestModeSaving = ref(false);
const guestModeMessage = ref('');
const guestModeMessageTone = ref<'ok' | 'warn'>('ok');

// Users
const userList = ref<any[]>([]);
const showCreateUserModal = ref(false);
const creatingUser = ref(false);
const newUserForm = reactive({
  username: '',
  password: '',
  role: 'member',
});

// Audit Logs
const auditLogs = ref<any[]>([]);
const loadingLogs = ref(false);

function formatDate(timestamp: number | string) {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleString('zh-CN', { hour12: false });
}

async function loadSecuritySettings() {
  try {
    const res = await axios.get('/api/bot/settings');
    if (Array.isArray(res.data.adminGroups)) {
      adminGroupsInput.value = res.data.adminGroups.join(', ');
    }
    if (res.data.guestMode) {
      guestModeForm.enabled = Boolean(res.data.guestMode.enabled);
      if (res.data.guestMode.permissions) {
        Object.assign(guestModeForm.permissions, res.data.guestMode.permissions);
      }
    }
  } catch {
    store.notify('安全设置加载失败', 'error');
  }
}

async function saveAdminGroups() {
  adminGroupsSaving.value = true;
  adminGroupsMessage.value = '';
  const groups = adminGroupsInput.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  try {
    await axios.post('/api/bot/settings', { adminGroups: groups });
    adminGroupsMessageTone.value = 'ok';
    adminGroupsMessage.value = '已保存';
  } catch {
    adminGroupsMessageTone.value = 'warn';
    adminGroupsMessage.value = '保存失败';
  } finally {
    adminGroupsSaving.value = false;
  }
}

async function saveGuestMode() {
  guestModeSaving.value = true;
  guestModeMessage.value = '';
  try {
    await axios.post('/api/bot/settings', {
      guestMode: guestModeForm,
    });
    guestModeMessageTone.value = 'ok';
    guestModeMessage.value = '已保存';
  } catch {
    guestModeMessageTone.value = 'warn';
    guestModeMessage.value = '保存失败';
  } finally {
    guestModeSaving.value = false;
  }
}

async function loadUsers() {
  try {
    const res = await axios.get('/api/users');
    userList.value = res.data?.users || [];
  } catch {
    store.notify('用户列表加载失败', 'error');
  }
}

function openCreateUserModal() {
  newUserForm.username = '';
  newUserForm.password = '';
  newUserForm.role = 'member';
  showCreateUserModal.value = true;
}

async function submitCreateUser() {
  if (!newUserForm.username || !newUserForm.password) return;
  creatingUser.value = true;
  try {
    await axios.post('/api/users', newUserForm);
    showCreateUserModal.value = false;
    await loadUsers();
  } catch (err: any) {
    alert(err?.response?.data?.error || '创建用户失败');
  } finally {
    creatingUser.value = false;
  }
}

async function deleteUser(u: any) {
  if (!confirm(`确认删除用户 "${u.username}"？`)) return;
  try {
    await axios.delete(`/api/users/${u.id}`);
    await loadUsers();
  } catch (err: any) {
    alert(err?.response?.data?.error || '删除失败');
  }
}

async function loadAuditLogs() {
  loadingLogs.value = true;
  try {
    const res = await axios.get('/api/audit');
    auditLogs.value = res.data?.logs || [];
  } catch {
    store.notify('审计日志加载失败', 'error');
  }
  finally {
    loadingLogs.value = false;
  }
}

onMounted(() => {
  if (session.isAdmin.value) {
    loadSecuritySettings();
    loadUsers();
    loadAuditLogs();
  }
});
</script>

<style scoped>
.permission-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}
.perm-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
.user-table-wrap {
  overflow-x: auto;
}
.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.user-table th, .user-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-color);
  text-align: left;
}
.status-indicator.ok { color: #2ed573; }
.status-indicator.fail { color: #ff4757; }
</style>
