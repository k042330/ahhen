import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const AttendanceSystem = () => {
  const [records, setRecords] = useState([]);
  const { token } = useAuth();

  const fetchRecords = async () => {
    try {
      const response = await fetch('/api/attendance/records', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setRecords(data);
    } catch (error) {
      console.error('獲取記錄失敗:', error);
    }
  };

  const handleClock = async (type) => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ type, location })
      });

      fetchRecords();
    } catch (error) {
      console.error('打卡失敗:', error);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">打卡系統</h1>
        <div className="flex gap-4">
          <button
            onClick={() => handleClock('clockIn')}
            className="bg-green-500 text-white px-6 py-2 rounded"
          >
            上班打卡
          </button>
          <button
            onClick={() => handleClock('clockOut')}
            className="bg-blue-500 text-white px-6 py-2 rounded"
          >
            下班打卡
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">打卡記錄</h2>
        <div className="space-y-2">
          {records.map((record) => (
            <div
              key={record._id}
              className="border p-4 rounded"
            >
              <div>類型: {record.type === 'clockIn' ? '上班' : '下班'}</div>
              <div>時間: {new Date(record.timestamp).toLocaleString()}</div>
              {record.location && (
                <div>
                  位置: {record.location.latitude}, {record.location.longitude}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};