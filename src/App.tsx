import React, { useState, useEffect, useRef } from 'react';
import {
  Container, Title, Select, Button, Textarea, Card, Text, Loader, Group,
  Stack, Notification, ActionIcon, Paper, Grid, ScrollArea
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import axios from 'axios';

const API_BASE = 'http://192.168.31.132:3100';
const RAG_BASE = 'http://192.168.31.132:8500';

function App() {
  const [models, setModels] = useState([]);
  const [currentModel, setCurrentModel] = useState('');
  const [tools, setTools] = useState([]);
  const [message, setMessage] = useState('');
  const [recallQuery, setRecallQuery] = useState('');
  const [recallResults, setRecallResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    axios.get(`${API_BASE}/api/models`).then(res => {
      setModels(res.data.models);
      setCurrentModel(res.data.currentModel || res.data.models[0]);
    }).catch(() => setError('無法取得模型清單'));

    axios.get(`${API_BASE}/api/tools`).then(res => {
      setTools(res.data.tools || []);
    }).catch(() => setError('無法取得工具清單'));
  }, []);

  const sendMessage = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/chat`, { message });
      setChatHistory(prev => [...prev, { user: message, assistant: res.data.reply }]);
      setMessage('');
    } catch (err) {
      setError('無法取得 AI 回覆');
    } finally {
      setLoading(false);
    }
  };

  const newChat = async () => {
    await axios.post(`${API_BASE}/api/chat/new`);
    setChatHistory([]);
  };

  const uploadFile = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', 'General');
    formData.append('user_tag', '');

    try {
      const res = await axios.post(`${RAG_BASE}/upload_file`, formData);
      if (res.data.error) {
        alert(`錯誤：${res.data.error}`);
      } else {
        const { success = 0, fail = 0, filename = '' } = res.data;
        alert(`檔案 ${filename} 已上傳 ${success} 筆，失敗 ${fail}`);
      }
    } catch (e) {
      alert(`檔案上傳失敗：${e.message || e}`);
    }    
  };
  

  const rememberAnswer = async (text) => {
    try {
      await axios.post(`${RAG_BASE}/remember`, {
        text,
        type: 'fact',
        tag: ['manual'],
        domain: 'chat',
        user: 'user1'
      });
      alert('已儲存此回答');
    } catch (e) {
      alert('儲存失敗');
    }
  };


  return (
    <Container fluid>
      <Title mb="md">RT Lab Chatroom</Title>
      {error && <Notification color="red" onClose={() => setError('')}>{error}</Notification>}

      <Grid>
        <Grid.Col span={3}>
          <Title order={5}>工具清單</Title>
          <ScrollArea h={600}>
            <Stack spacing="xs" mt="sm">
              {tools.map((tool, i) => (
                <Card key={i} shadow="xs" p="sm">
                  <Text size="sm" fw={500}>{tool.name}</Text>
                  <Text size="xs" c="dimmed">{tool.description || '無描述'}</Text>
                </Card>
              ))}
            </Stack>
          </ScrollArea>
        </Grid.Col>

        <Grid.Col span={9}>
          <Select
            label="選擇模型"
            data={models}
            value={currentModel}
            onChange={(value) => {
              setCurrentModel(value);
              axios.post(`${API_BASE}/api/model/select`, { model: value })
                .then(() => console.log(`切換模型為 ${value}`))
                .catch(() => setError('模型切換失敗'));
            }}
            mb="md"
          />

          <Stack>
            {chatHistory.map((msg, i) => (
              <Card key={i} shadow="sm">
                <Text size="sm" c="dimmed"><b>你：</b> {msg.user}</Text>
                <Text size="sm"><b>AI：</b> {msg.assistant}</Text>
                <Button mt="sm" size="xs"variant="light" onClick={() => rememberAnswer(`User: ${msg.user}\nAI: ${msg.assistant}`)}>
                  記住這段 Q&A
                </Button>
              </Card>
            ))}
          </Stack>

          <Paper withBorder radius="xl" p="md" mt="md" style={{ display: 'flex', alignItems: 'center' }}>
            <ActionIcon variant="default" size="lg" radius="xl" onClick={() => fileInputRef.current?.click()}>
              <IconPlus size={18} />
            </ActionIcon>

            <Textarea
              placeholder="輸入訊息..."
              value={message}
              onChange={(e) => setMessage(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              autosize
              minRows={1}
              maxRows={4}
              style={{ flexGrow: 1, marginLeft: '1rem', marginRight: '1rem' }}
            />

            <Button onClick={sendMessage} disabled={loading} radius="xl">
              {loading ? <Loader size="xs" color="white" /> : '送出'}
            </Button>
          </Paper>

          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => uploadFile(e.target.files[0])}
            style={{ display: 'none' }}
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          />

          <Button variant="outline" fullWidth mt="md" onClick={newChat}>
            新對話
          </Button>

          <Stack mt="sm">
            {recallResults.map((res, idx) => (
              <Card key={idx} shadow="xs">
                <Text size="sm">{res}</Text>
              </Card>
            ))}
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}

export default App;