#!/usr/bin/env node

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

const KEYWORDS = ['next', 'skip'];
const PORT = 3003;

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Serve HTML page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Voice Keyword Detector</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #1e1e1e;
            color: #d4d4d4;
        }
        h1 { color: #4ec9b0; }
        .status {
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            background: #2d2d30;
            border: 1px solid #3e3e42;
        }
        .listening { border-color: #4ec9b0; background: #1e3a2e; }
        .keyword-detected {
            animation: pulse 0.5s;
            background: #2e4e3e !important;
            border-color: #4ec9b0 !important;
        }
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.02); }
            100% { transform: scale(1); }
        }
        #transcript {
            padding: 15px;
            background: #252526;
            border-radius: 5px;
            min-height: 100px;
            margin: 20px 0;
            border: 1px solid #3e3e42;
        }
        .keyword {
            display: inline-block;
            padding: 5px 10px;
            margin: 5px;
            background: #4ec9b0;
            color: #1e1e1e;
            border-radius: 3px;
            font-weight: bold;
        }
        #log {
            padding: 15px;
            background: #1e1e1e;
            border-radius: 5px;
            max-height: 300px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            border: 1px solid #3e3e42;
        }
        .log-entry {
            margin: 5px 0;
            padding: 5px;
            border-left: 3px solid #3e3e42;
        }
        .log-keyword {
            border-left-color: #4ec9b0;
            background: #1e3a2e;
        }
        button {
            padding: 10px 20px;
            font-size: 16px;
            background: #4ec9b0;
            color: #1e1e1e;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            margin: 10px 5px;
        }
        button:hover { background: #3ea894; }
        button:disabled {
            background: #3e3e42;
            cursor: not-allowed;
        }
        .controls { margin: 20px 0; }
        .detected-count {
            display: inline-block;
            padding: 5px 15px;
            background: #252526;
            border-radius: 3px;
            margin-left: 10px;
        }
    </style>
</head>
<body>
    <h1>🎤 Voice Keyword Detector</h1>

    <div class="status" id="status">
        <strong>Status:</strong> <span id="statusText">Initializing...</span>
    </div>

    <div class="controls">
        <button id="startBtn">Start Listening</button>
        <button id="stopBtn" disabled>Stop Listening</button>
        <button id="clearBtn">Clear Log</button>
        <span class="detected-count">
            Next: <strong id="nextCount">0</strong>
        </span>
        <span class="detected-count">
            Skip: <strong id="skipCount">0</strong>
        </span>
    </div>

    <div id="transcript">
        <strong>Current transcript:</strong><br>
        <span id="transcriptText">Waiting to start...</span>
    </div>

    <div>
        <strong>Detected Keywords:</strong>
        <div id="keywords"></div>
    </div>

    <div>
        <strong>Log:</strong>
        <div id="log"></div>
    </div>

    <script src="/socket.io/socket.io.js"></script>
    <script>
        const socket = io();
        const keywords = ['next', 'skip'];
        let recognition = null;
        let isListening = false;
        let keywordCounts = { next: 0, skip: 0 };

        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Speech recognition not supported in this browser. Please use Chrome.');
        }

        // Initialize speech recognition
        function initRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();

            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onstart = () => {
                isListening = true;
                document.getElementById('status').classList.add('listening');
                document.getElementById('statusText').textContent = '🔴 Listening for keywords: ' + keywords.join(', ').toUpperCase();
                document.getElementById('startBtn').disabled = true;
                document.getElementById('stopBtn').disabled = false;
                addLog('Started listening...', 'info');
            };

            recognition.onresult = (event) => {
                let finalTranscript = '';
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                const currentTranscript = finalTranscript || interimTranscript;
                document.getElementById('transcriptText').textContent = currentTranscript;

                // Check for keywords
                const lowerTranscript = currentTranscript.toLowerCase();
                for (const keyword of keywords) {
                    if (lowerTranscript.includes(keyword)) {
                        if (finalTranscript) {
                            handleKeywordDetected(keyword, currentTranscript);
                        }
                    }
                }

                if (finalTranscript) {
                    addLog('Heard: "' + finalTranscript + '"', 'transcript');
                }
            };

            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                addLog('Error: ' + event.error, 'error');

                if (event.error === 'no-speech') {
                    // Continue listening
                    return;
                }

                stopListening();
            };

            recognition.onend = () => {
                if (isListening) {
                    // Restart if we're supposed to be listening
                    recognition.start();
                } else {
                    document.getElementById('status').classList.remove('listening');
                    document.getElementById('statusText').textContent = 'Stopped';
                    document.getElementById('startBtn').disabled = false;
                    document.getElementById('stopBtn').disabled = true;
                }
            };
        }

        function handleKeywordDetected(keyword, transcript) {
            // Update count
            keywordCounts[keyword]++;
            document.getElementById(keyword + 'Count').textContent = keywordCounts[keyword];

            // Visual feedback
            document.getElementById('status').classList.add('keyword-detected');
            setTimeout(() => {
                document.getElementById('status').classList.remove('keyword-detected');
            }, 500);

            // Add keyword badge
            const keywordDiv = document.getElementById('keywords');
            const badge = document.createElement('span');
            badge.className = 'keyword';
            badge.textContent = keyword.toUpperCase();
            keywordDiv.appendChild(badge);

            // Add to log
            const timestamp = new Date().toLocaleTimeString();
            addLog(\`[\${timestamp}] KEYWORD DETECTED: "\${keyword}" in "\${transcript}"\`, 'keyword');

            // Send to server
            socket.emit('keywordDetected', {
                keyword,
                transcript,
                timestamp: new Date().toISOString()
            });
        }

        function addLog(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = 'log-entry' + (type === 'keyword' ? ' log-keyword' : '');
            entry.textContent = message;
            logDiv.insertBefore(entry, logDiv.firstChild);

            // Keep only last 50 entries
            while (logDiv.children.length > 50) {
                logDiv.removeChild(logDiv.lastChild);
            }
        }

        function startListening() {
            if (!recognition) {
                initRecognition();
            }
            recognition.start();
        }

        function stopListening() {
            isListening = false;
            if (recognition) {
                recognition.stop();
            }
        }

        // Button handlers
        document.getElementById('startBtn').onclick = startListening;
        document.getElementById('stopBtn').onclick = stopListening;
        document.getElementById('clearBtn').onclick = () => {
            document.getElementById('log').innerHTML = '';
            document.getElementById('keywords').innerHTML = '';
            document.getElementById('transcriptText').textContent = 'Waiting...';
        };

        // Socket handlers
        socket.on('connect', () => {
            addLog('Connected to server', 'info');
        });

        socket.on('serverMessage', (data) => {
            addLog('Server: ' + data.message, 'info');
        });

        // Initialize
        initRecognition();
    </script>
</body>
</html>
  `);
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('🌐 Browser client connected');

  socket.on('keywordDetected', (data) => {
    const emoji = data.keyword === 'next' ? '⏭️' : '⏩';

    console.log(`\n${emoji} \x1b[1m\x1b[32mKEYWORD DETECTED: "${data.keyword.toUpperCase()}"\x1b[0m`);
    console.log(`   📝 Full transcript: "${data.transcript}"`);
    console.log(`   🕐 Timestamp: ${data.timestamp}`);
    console.log('─'.repeat(50));

    // Broadcast to all clients
    io.emit('serverMessage', {
      message: `Keyword "${data.keyword}" detected`
    });
  });

  socket.on('disconnect', () => {
    console.log('🔌 Browser client disconnected');
  });
});

// Start server
server.listen(PORT, () => {
  console.clear();
  console.log('🚀 \x1b[1mBrowser-Based Voice Keyword Detector\x1b[0m');
  console.log('─'.repeat(50));
  console.log(`🌐 Server running at: http://localhost:${PORT}`);
  console.log(`🔊 Listening for keywords: ${KEYWORDS.map(k => k.toUpperCase()).join(', ')}`);
  console.log('');
  console.log('📱 Instructions:');
  console.log(`   1. Open http://localhost:${PORT} in Chrome`);
  console.log('   2. Click "Start Listening"');
  console.log('   3. Allow microphone access');
  console.log('   4. Say "next" or "skip"');
  console.log('');
  console.log('📊 Keyword detections will appear here in the terminal');
  console.log('─'.repeat(50));
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close();
  process.exit(0);
});