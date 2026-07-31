// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ChatIcon from '@mui/icons-material/Chat';
import RefreshIcon from '@mui/icons-material/Refresh';
import ReactMarkdown from 'react-markdown';
import apiClient from '../../services/apiClient';
import { useAuth } from '../../contexts/AuthContext';
import { formatTimestamp } from '../../utils/formatters';
import type { ChatMessage } from '../../types';

interface ChatInterfaceProps {
  claimId: string;
}

const SUGGESTED_PROMPTS = [
  'Show me the evidence',
  'Has this provider submitted similar claims?',
  'Draft a rejection note',
  'What VA policy applies?',
  'Explain this finding in detail',
];

const TypingIndicator: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 2, py: 1 }}>
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: '#5B616B',
          animation: 'typing-bounce 1.4s infinite ease-in-out',
          animationDelay: `${i * 0.16}s`,
          '@keyframes typing-bounce': {
            '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: 0.4 },
            '40%': { transform: 'scale(1)', opacity: 1 },
          },
        }}
      />
    ))}
    <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
      CMS Fraud Shield AI is thinking...
    </Typography>
  </Box>
);

const ChatInterface: React.FC<ChatInterfaceProps> = ({ claimId }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClearChat = async () => {
    try {
      await apiClient.delete(`/claims/${claimId}/chat/clear`);
      setMessages([]);
    } catch (error) {
      console.error('Failed to clear chat history:', error);
    }
  };

  const scrollToBottom = useCallback(() => {
    // Scroll only within the chat's own container, not the parent Deep Dive panel
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await apiClient.get<ChatMessage[]>(
          `/claims/${claimId}/chat/history`
        );
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch chat history:', error);
      }
    };

    fetchHistory();
  }, [claimId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending, scrollToBottom]);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    const userMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      claim_id: claimId,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const response = await apiClient.post<ChatMessage>(
        `/claims/${claimId}/chat`,
        {
          message: trimmed,
          sessionUser: user?.name ?? 'Unknown',
        }
      );
      setMessages((prev) => [...prev, response.data]);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        claim_id: claimId,
        role: 'assistant',
        content: 'Sorry, I was unable to process your request. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [input, sending, claimId, user?.name]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleChipClick = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        height: 480,
        mb: 2,
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <ChatIcon sx={{ color: '#112E51', fontSize: 20 }} />
        <Typography variant="subtitle2" fontWeight={700} color="primary.dark" sx={{ flexGrow: 1 }}>
          Chat with Claim
        </Typography>
        <IconButton
          size="small"
          onClick={handleClearChat}
          title="Clear Chat History"
          sx={{
            color: '#5B616B',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              color: '#112E51',
            },
          }}
        >
          <RefreshIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Stack>

      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
        }}
      >
        {messages.length === 0 && !sending && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Ask CMS Fraud Shield AI anything about this claim.
              <br />
              Use the suggested prompts below or type your own question.
            </Typography>
          </Box>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <Box
              key={msg.id}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, px: 0.5 }}>
                {isUser ? 'You' : 'CMS Fraud Shield AI'} &middot; {formatTimestamp(msg.created_at)}
              </Typography>
              <Box
                sx={{
                  backgroundColor: isUser ? '#112E51' : '#F1F1F1',
                  color: isUser ? '#FFFFFF' : '#212121',
                  borderRadius: isUser
                    ? '16px 16px 4px 16px'
                    : '16px 16px 16px 4px',
                  px: 2,
                  py: 1.25,
                  '& p': { m: 0 },
                  '& p + p': { mt: 1 },
                  '& ul, & ol': { my: 0.5, pl: 2.5 },
                  '& table': {
                    borderCollapse: 'collapse',
                    width: '100%',
                    my: 1,
                    fontSize: '0.8rem',
                  },
                  '& th, & td': {
                    border: '1px solid',
                    borderColor: isUser ? 'rgba(255,255,255,0.3)' : 'divider',
                    px: 1,
                    py: 0.5,
                    textAlign: 'left',
                  },
                  '& th': {
                    fontWeight: 700,
                    backgroundColor: isUser
                      ? 'rgba(255,255,255,0.1)'
                      : 'rgba(0,0,0,0.04)',
                  },
                  '& code': {
                    fontFamily: 'monospace',
                    fontSize: '0.85em',
                    backgroundColor: isUser
                      ? 'rgba(255,255,255,0.15)'
                      : 'rgba(0,0,0,0.06)',
                    px: 0.5,
                    borderRadius: 0.5,
                  },
                  '& strong': { fontWeight: 700 },
                }}
              >
                {isUser ? (
                  <Typography variant="body2">{msg.content}</Typography>
                ) : (
                  <Typography variant="body2" component="div">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}

        {sending && <TypingIndicator />}
      </Box>

      <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={0.75} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size="small"
              variant="outlined"
              onClick={() => handleChipClick(prompt)}
              sx={{
                fontSize: '0.7rem',
                cursor: 'pointer',
                borderColor: '#205493',
                color: '#205493',
                '&:hover': {
                  backgroundColor: '#E1F3F8',
                },
              }}
            />
          ))}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            inputRef={inputRef}
            fullWidth
            size="small"
            placeholder="Ask about this claim..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            multiline
            maxRows={3}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            sx={{
              backgroundColor: '#112E51',
              color: '#FFFFFF',
              '&:hover': { backgroundColor: '#205493' },
              '&.Mui-disabled': {
                backgroundColor: 'grey.300',
                color: 'grey.500',
              },
              width: 40,
              height: 40,
            }}
          >
            <SendIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Stack>
      </Box>
    </Paper>
  );
};

export default ChatInterface;
