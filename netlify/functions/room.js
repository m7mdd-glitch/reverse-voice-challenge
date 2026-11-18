const fs = require('fs');
const path = require('path');

// مسار التخزين المؤقت في سيرفرات Netlify Functions
const CACHE_FILE = path.join('/tmp', 'reverse_game_rooms.json');

// قراءة بيانات الغرف من الذاكرة أو الملف
function loadRooms() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }
  } catch (err) {
    console.warn("Error reading cache file:", err);
  }
  return {};
}

// حفظ بيانات الغرف
function saveRooms(data) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data));
  } catch (err) {
    console.warn("Error saving cache file:", err);
  }
}

// ذاكرة سريعة في الحاوية (In-Memory Map)
const memoryRooms = loadRooms();

exports.handler = async (event, context) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
  };

  // التعامل مع طلبات CORS Preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  const { httpMethod, queryStringParameters, body } = event;
  const code = (queryStringParameters && queryStringParameters.code) ? queryStringParameters.code.trim() : null;

  try {
    // 1. جلب بيانات الغرفة: GET /api/room?code=12345
    if (httpMethod === "GET") {
      if (!code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Room code required" })
        };
      }

      const room = memoryRooms[code];
      if (!room) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: "Room not found" })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(room)
      };
    }

    // 2. إنشاء غرفة جديدة: POST /api/room
    if (httpMethod === "POST") {
      const data = JSON.parse(body || "{}");
      const roomCode = data.code || Math.floor(10000 + Math.random() * 90000).toString();
      
      const newRoom = {
        ...data,
        code: roomCode,
        updatedAt: Date.now()
      };

      memoryRooms[roomCode] = newRoom;
      saveRooms(memoryRooms);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newRoom)
      };
    }

    // 3. تحديث حالة الغرفة: PUT /api/room?code=12345
    if (httpMethod === "PUT") {
      if (!code) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: "Room code required" })
        };
      }

      const incomingData = JSON.parse(body || "{}");
      const existing = memoryRooms[code] || {};
      
      const updatedRoom = {
        ...existing,
        ...incomingData,
        code: code,
        updatedAt: Date.now()
      };

      memoryRooms[code] = updatedRoom;
      saveRooms(memoryRooms);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedRoom)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed" })
    };

  } catch (err) {
    console.error("Netlify Function Handler Error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
