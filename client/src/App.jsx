import React, { useState, useEffect } from 'react';

const App = () => {
  const [user, setUser] = useState(null);
  const [records, setRecords] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // 登入功能
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('token', data.token);
      }
    } catch (error) {
      console.error('登入失敗:', error);
    }
  };

  // 打卡功能
  const handleClock = async (type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ type }),
      });
      if (response.ok) {
        fetchRecords();
      }
    } catch (error) {
      console.error('打卡失敗:', error);
    }
  };

  // 獲取打卡記錄
  const fetchRecords = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance/records', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setRecords(data.records);
    } catch (error) {
      console.error('獲取記錄失敗:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '40px auto', padding: '20px' }}>
      <div className="card" style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>打卡系統</h1>
        
        {!user ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="使用者名稱"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <button 
              type="submit"
              style={{
                padding: '10px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              登入
            </button>
          </form>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
              <button
                onClick={() => handleClock('clockIn')}
                style={{
                  padding: '10px 20px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                上班打卡
              </button>
              <button
                onClick={() => handleClock('clockOut')}
                style={{
                  padding: '10px 20px',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                下班打卡
              </button>
            </div>

            <div>
              <h3 style={{ marginBottom: '10px' }}>打卡記錄</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {records.map((record, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px',
                      background: '#f5f5f5',
                      borderRadius: '4px'
                    }}
                  >
                    <span>{record.type === 'clockIn' ? '上班' : '下班'}</span>
                    <span>{new Date(record.timestamp).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;