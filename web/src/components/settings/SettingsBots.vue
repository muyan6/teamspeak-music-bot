<template>
  <section v-if="can('bot.manage')" class="settings-section">
    <h2 class="section-title">机器人管理</h2>

    <!-- Batch Actions Toolbar -->
    <div v-if="store.bots.length > 0" class="bot-batch-toolbar">
      <label class="batch-select-all">
        <input
          type="checkbox"
          :checked="isAllSelected"
          :indeterminate.prop="isPartiallySelected"
          @change="toggleSelectAll(($event.target as HTMLInputElement).checked)"
        />
        <span>全选</span>
        <span class="batch-count">（已选 {{ selectedBotIds.length }} / {{ store.bots.length }}）</span>
      </label>
      <div class="batch-buttons">
        <button
          class="btn-sm btn-batch-start"
          :disabled="selectedBotIds.length === 0 || batchStarting || batchStopping"
          @click="batchStartSelected"
        >
          <Icon icon="mdi:play" />
          {{ batchStarting ? '开启中…' : '一键开启' }}
        </button>
        <button
          class="btn-sm btn-batch-stop"
          :disabled="selectedBotIds.length === 0 || batchStarting || batchStopping"
          @click="batchStopSelected"
        >
          <Icon icon="mdi:stop" />
          {{ batchStopping ? '关闭中…' : '一键关闭' }}
        </button>
      </div>
    </div>

    <div class="bot-list">
      <div v-for="bot in store.bots" :key="bot.id" class="bot-item" :class="{ selected: selectedBotIds.includes(bot.id) }">
        <div class="bot-left-col">
          <label class="bot-checkbox-label" @click.stop>
            <input
              type="checkbox"
              :checked="selectedBotIds.includes(bot.id)"
              @change="toggleBotSelect(bot.id, ($event.target as HTMLInputElement).checked)"
            />
          </label>
          <div class="bot-info">
            <div class="bot-name">{{ bot.name }}</div>
            <div class="bot-status" :class="botStatusClass(bot)">
              {{ botStatusText(bot) }}
            </div>
          </div>
        </div>
        <div class="bot-actions">
          <button class="btn-sm" :disabled="batchStarting || batchStopping" @click="toggleBot(bot.id, bot.connected)">
            {{ bot.connected ? '停止' : '启动' }}
          </button>
          <button class="btn-sm btn-edit" @click="openEditBot(bot)">
            <Icon icon="mdi:pencil" />
          </button>
          <button class="btn-sm btn-delete" @click="deleteBot(bot.id, bot.name)">
            <Icon icon="mdi:delete" />
          </button>
        </div>
      </div>
    </div>

    <!-- Edit Bot Modal -->
    <div v-if="editingBot" class="edit-modal-overlay" @click.self="editingBot = null">
      <div class="edit-modal">
        <h3 class="modal-title">编辑机器人</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="editForm.name" class="input" />
        </div>
        <div class="form-group">
          <label>服务器地址</label>
          <input v-model="editForm.serverAddress" class="input" placeholder="ts.example.com" />
        </div>
        <div class="form-row">
          <div class="form-group" style="flex:1">
            <label>端口</label>
            <input v-model.number="editForm.serverPort" type="number" class="input" />
          </div>
          <div class="form-group" style="flex:2">
            <label>昵称</label>
            <input v-model="editForm.nickname" class="input" />
          </div>
        </div>
        <div class="form-group">
          <label>默认频道名称（可选）</label>
          <input v-model="editForm.defaultChannel" :disabled="!!editForm.channelId" class="input" :class="{ disabled: !!editForm.channelId }" placeholder="音乐频道" />
        </div>
        <div class="form-group">
          <label>默认频道ID（可选）</label>
          <input v-model="editForm.channelId" :disabled="!!editForm.defaultChannel" class="input" :class="{ disabled: !!editForm.defaultChannel }" placeholder="如 12" />
        </div>
        <div class="form-group">
          <label>频道密码（可选）</label>
          <input v-model="editForm.channelPassword" type="password" class="input" />
        </div>
        <div class="form-group">
          <label>服务器密码（可选）</label>
          <input v-model="editForm.serverPassword" type="password" class="input" />
        </div>

        <div class="form-group">
          <label>自定义头像</label>
          <p class="edit-avatar-hint">头像与昵称由「个人资料」设置接管，可在此上传自定义头像并在个人资料中选择应用。</p>
          <CustomAvatarRow
            v-if="editingBot"
            :bot-id="editingBot"
            @avatar-changed="onAvatarChanged"
          />
        </div>

        <div class="modal-actions">
          <button class="btn-sm" @click="editingBot = null">取消</button>
          <button class="btn-sm btn-primary" @click="saveEditBot">保存</button>
        </div>
      </div>
    </div>

    <!-- Create Bot Form -->
    <form class="create-bot-form" @submit.prevent="createBot">
      <h3 class="form-title">添加机器人</h3>
      <div class="form-row">
        <div class="form-group">
          <label>名称</label>
          <input v-model="newBotName" class="input" placeholder="Bot 1" required />
        </div>
        <div class="form-group">
          <label>服务器地址</label>
          <input v-model="newBotServer" class="input" placeholder="ts.example.com" required />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>端口</label>
          <input v-model.number="newBotPort" type="number" class="input" placeholder="9987" />
        </div>
        <div class="form-group">
          <label>昵称</label>
          <input v-model="newBotNickname" class="input" placeholder="MusicBot" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>默认频道名称（可选）</label>
          <input v-model="newBotChannel" :disabled="!!newBotChannelId" class="input" :class="{ disabled: !!newBotChannelId }" placeholder="留空默认大厅" />
        </div>
        <div class="form-group">
          <label>默认频道ID（可选）</label>
          <input v-model="newBotChannelId" :disabled="!!newBotChannel" class="input" :class="{ disabled: !!newBotChannel }" placeholder="如 12（与名称二选一）" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>频道密码（可选）</label>
          <input v-model="newBotChannelPassword" type="password" class="input" placeholder="无密码请留空" />
        </div>
        <div class="form-group">
          <label>服务器密码（可选）</label>
          <input v-model="newBotServerPassword" type="password" class="input" placeholder="无密码请留空" />
        </div>
      </div>
      <div class="form-group">
        <label>机器人头像（可选）</label>
        <AvatarUpload v-model="newBotAvatar" />
      </div>
      <button type="submit" class="btn-primary">添加</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { Icon } from '@iconify/vue';
import axios from 'axios';
import { usePlayerStore } from '../../stores/player';
import { useSession } from '../../composables/useSession.js';
import AvatarUpload from '../AvatarUpload.vue';
import CustomAvatarRow from '../CustomAvatarRow.vue';

const store = usePlayerStore();
const session = useSession();
const { can } = session;

// Bot create form
const newBotName = ref('');
const newBotServer = ref('');
const newBotPort = ref(9987);
const newBotNickname = ref('MusicBot');
const newBotChannel = ref('');
const newBotChannelId = ref('');
const newBotChannelPassword = ref('');
const newBotServerPassword = ref('');
const newBotAvatar = ref<string | null>(null);

// Bot edit
const editingBot = ref<string | null>(null);
const editForm = reactive({
  name: '',
  serverAddress: '',
  serverPort: 9987,
  nickname: '',
  defaultChannel: '',
  channelId: '',
  channelPassword: '',
  serverPassword: '',
});

// Batch bot operations
const selectedBotIds = ref<string[]>([]);
const batchStarting = ref(false);
const batchStopping = ref(false);

const isAllSelected = computed(
  () => store.bots.length > 0 && selectedBotIds.value.length === store.bots.length,
);
const isPartiallySelected = computed(
  () => selectedBotIds.value.length > 0 && selectedBotIds.value.length < store.bots.length,
);

function toggleSelectAll(checked: boolean) {
  if (checked) {
    selectedBotIds.value = store.bots.map((b) => b.id);
  } else {
    selectedBotIds.value = [];
  }
}

function toggleBotSelect(id: string, checked: boolean) {
  if (checked) {
    if (!selectedBotIds.value.includes(id)) {
      selectedBotIds.value.push(id);
    }
  } else {
    selectedBotIds.value = selectedBotIds.value.filter((bId) => bId !== id);
  }
}

async function batchStartSelected() {
  if (selectedBotIds.value.length === 0 || batchStarting.value || batchStopping.value) return;
  batchStarting.value = true;
  try {
    await axios.post('/api/bot/batch/start', { ids: selectedBotIds.value });
    await store.fetchBots();
  } catch {
    // Ignore
  } finally {
    batchStarting.value = false;
  }
}

async function batchStopSelected() {
  if (selectedBotIds.value.length === 0 || batchStarting.value || batchStopping.value) return;
  batchStopping.value = true;
  try {
    await axios.post('/api/bot/batch/stop', { ids: selectedBotIds.value });
    await store.fetchBots();
  } catch {
    // Ignore
  } finally {
    batchStopping.value = false;
  }
}

async function openEditBot(bot: any) {
  editingBot.value = bot.id;
  editForm.name = bot.name;
  try {
    const res = await axios.get(`/api/bot/${bot.id}/config`);
    editForm.serverAddress = res.data.serverAddress ?? '';
    editForm.serverPort = res.data.serverPort ?? 9987;
    editForm.nickname = res.data.nickname ?? '';
    editForm.defaultChannel = res.data.defaultChannel ?? '';
    editForm.channelId = res.data.channelId ?? '';
    editForm.channelPassword = res.data.channelPassword ?? '';
    editForm.serverPassword = res.data.serverPassword ?? '';
  } catch {
    editForm.serverAddress = '';
    editForm.serverPort = 9987;
    editForm.nickname = bot.name;
    editForm.defaultChannel = '';
    editForm.channelId = '';
    editForm.channelPassword = '';
    editForm.serverPassword = '';
  }
}

async function saveEditBot() {
  if (!editingBot.value) return;
  try {
    await axios.put(`/api/bot/${editingBot.value}`, editForm);
    editingBot.value = null;
    await store.fetchBots();
  } catch {
    // Ignore
  }
}

async function toggleBot(botId: string, connected: boolean) {
  try {
    if (connected) {
      await axios.post(`/api/bot/${botId}/stop`);
    } else {
      await axios.post(`/api/bot/${botId}/start`);
    }
    await store.fetchBots();
  } catch {
    // Ignore
  }
}

async function deleteBot(botId: string, botName: string) {
  if (!confirm(`确认删除机器人 "${botName}"？此操作不可撤销。`)) return;
  try {
    await axios.delete(`/api/bot/${botId}`);
    if (store.activeBotId === botId) {
      store.activeBotId = null;
    }
    if (selectedBotIds.value.includes(botId)) {
      selectedBotIds.value = selectedBotIds.value.filter((id) => id !== botId);
    }
    store.removeBotStatus(botId);
    await store.fetchBots();
  } catch {
    // Ignore
  }
}

async function createBot() {
  try {
    const res = await axios.post('/api/bot', {
      name: newBotName.value,
      serverAddress: newBotServer.value,
      serverPort: newBotPort.value,
      nickname: newBotNickname.value,
      defaultChannel: newBotChannel.value || undefined,
      channelId: newBotChannelId.value || undefined,
      channelPassword: newBotChannelPassword.value || undefined,
      serverPassword: newBotServerPassword.value || undefined,
    });
    if (newBotAvatar.value) {
      try {
        await axios.put(`/api/bot/${res.data.id}/avatar`, { dataUrl: newBotAvatar.value });
      } catch (err) {
        console.warn('failed to set avatar on new bot', err);
      }
    }
    newBotName.value = '';
    newBotServer.value = '';
    newBotPort.value = 9987;
    newBotNickname.value = 'MusicBot';
    newBotChannel.value = '';
    newBotChannelId.value = '';
    newBotChannelPassword.value = '';
    newBotServerPassword.value = '';
    newBotAvatar.value = null;
    await store.fetchBots();
  } catch {
    // Ignore
  }
}

function onAvatarChanged() {
  // Avatar updated
}

function botStatusClass(bot: any) {
  if (!bot.connected) return 'offline';
  if (bot.playing) return 'playing';
  if (bot.paused) return 'paused';
  return 'online';
}

function botStatusText(bot: any) {
  if (!bot.connected) return '离线';
  if (bot.playing) return '播放中';
  if (bot.paused) return '已暂停';
  return '在线';
}
</script>
