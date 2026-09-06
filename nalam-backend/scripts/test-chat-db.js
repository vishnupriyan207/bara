require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const { legacyChat, createSession, sendMessageInSession, getSessionById, deleteSession } = require('../controllers/chatController');

async function runChatStorageTests() {
  console.log('🧪 Starting Chat Database Persistence Verification...');

  await connectDB();

  try {
    // TEST 1: Test legacyChat creates a new ChatSession and ChatMessages in MongoDB
    console.log('\n--- TEST 1: legacyChat initial message ---');
    let mockReq1 = {
      body: {
        messages: [
          { role: 'user', content: 'Doctor, I have had a mild headache since this morning.' }
        ]
      },
      user: null
    };

    let resData1 = null;
    let mockRes1 = {
      status: function(code) {
        return {
          json: function(data) {
            resData1 = data;
            return data;
          }
        };
      }
    };

    await legacyChat(mockReq1, mockRes1, (err) => {
      if (err) throw err;
    });

    console.log('legacyChat response received:', {
      success: resData1.success,
      sessionId: resData1.sessionId,
      responsePreview: resData1.response ? resData1.response.substring(0, 60) + '...' : null
    });

    if (!resData1.sessionId) {
      throw new Error('legacyChat did not return a sessionId!');
    }

    const createdSessionId = resData1.sessionId;

    // Verify session in MongoDB
    const sessionDoc1 = await ChatSession.findById(createdSessionId);
    if (!sessionDoc1) {
      throw new Error(`ChatSession ${createdSessionId} was not found in MongoDB!`);
    }
    console.log('✅ ChatSession verified in MongoDB:', {
      id: sessionDoc1._id.toString(),
      title: sessionDoc1.title,
      status: sessionDoc1.status
    });

    // Verify messages in MongoDB
    const messages1 = await ChatMessage.find({ sessionId: createdSessionId }).sort({ createdAt: 1 });
    console.log(`✅ Found ${messages1.length} ChatMessages in MongoDB for session:`);
    messages1.forEach((m, idx) => {
      console.log(`   [Message ${idx + 1}] Role: ${m.role} | Length: ${m.content.length} chars | Model: ${m.model}`);
    });

    if (messages1.length < 2) {
      throw new Error(`Expected at least 2 messages (user + assistant), found ${messages1.length}`);
    }

    const userMsg = messages1.find(m => m.role === 'user');
    const assistantMsg = messages1.find(m => m.role === 'assistant');

    if (!userMsg || !userMsg.content.includes('headache')) {
      throw new Error('User message not properly persisted in ChatMessage!');
    }
    if (!assistantMsg || !assistantMsg.content) {
      throw new Error('Assistant message not properly persisted in ChatMessage!');
    }

    // TEST 2: Send a follow-up message using the same sessionId
    console.log('\n--- TEST 2: legacyChat follow-up message with existing sessionId ---');
    let mockReq2 = {
      body: {
        sessionId: createdSessionId,
        messages: [
          { role: 'user', content: 'Doctor, I have had a mild headache since this morning.' },
          { role: 'assistant', content: assistantMsg.content },
          { role: 'user', content: 'No fever or nausea, just tension around my forehead.' }
        ]
      },
      user: null
    };

    let resData2 = null;
    let mockRes2 = {
      status: function(code) {
        return {
          json: function(data) {
            resData2 = data;
            return data;
          }
        };
      }
    };

    await legacyChat(mockReq2, mockRes2, (err) => {
      if (err) throw err;
    });

    if (resData2.sessionId !== createdSessionId) {
      throw new Error(`Session ID changed on follow-up: expected ${createdSessionId}, got ${resData2.sessionId}`);
    }

    // Verify that new messages were appended to the same ChatSession
    const messages2 = await ChatMessage.find({ sessionId: createdSessionId }).sort({ createdAt: 1 });
    console.log(`✅ Verified follow-up messages. Total ChatMessages now in DB: ${messages2.length}`);

    if (messages2.length < 4) {
      throw new Error(`Expected at least 4 messages after follow-up, found ${messages2.length}`);
    }

    // TEST 3: Soft-delete session
    console.log('\n--- TEST 3: Soft delete chat session ---');
    let deleteData = null;
    let mockReqDelete = {
      params: { id: createdSessionId },
      user: null,
      ip: '127.0.0.1',
      headers: {}
    };
    let mockResDelete = {
      status: function(code) {
        return {
          json: function(data) {
            deleteData = data;
            return data;
          }
        };
      }
    };

    await deleteSession(mockReqDelete, mockResDelete, (err) => {
      if (err) throw err;
    });

    const deletedDoc = await ChatSession.findById(createdSessionId);
    console.log('✅ Session status after delete:', deletedDoc.status);
    if (deletedDoc.status !== 'deleted') {
      throw new Error('ChatSession was not soft-deleted!');
    }

    // Clean up test documents
    console.log('\n--- Cleaning up test records ---');
    await ChatMessage.deleteMany({ sessionId: createdSessionId });
    await ChatSession.findByIdAndDelete(createdSessionId);
    console.log('✅ Cleaned up test session and messages successfully.');

    console.log('\n🎉 ALL CHAT DATABASE PERSISTENCE TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    process.exit(1);
  }
}

runChatStorageTests();
