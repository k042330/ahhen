import React, { useState, useEffect } from 'react';

function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [records, setRecords] = useState([]);

  // 獲取打卡記錄
  const fetchRecords = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const url = user.role === 'admin' 
        ? '/api/admin/records' 
        : '/api/attendance/records';
        
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRecords(data);
      }
    } catch (error) {
      console.error('獲取記錄失敗:', error);
    }
  };

  // 登入處理（已修改，添加調試日誌）
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
        console.log('Login response:', data); // 調試日誌
        setUser(data.user);
        localStorage.setItem('token', data.token);
        // 登入成功後獲取記錄
        fetchRecords();
      } else {
        alert(data.message || '登入失敗');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('登入失敗');
    }
  };

  // 打卡處理
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
        alert(type === 'clockIn' ? '上班打卡成功' : '下班打卡成功');
        fetchRecords(); // 重新獲取記錄
      }
    } catch (error) {
      alert('打卡失敗');
    }
  };

  // 登出處理
  const handleLogout = () => {
    setUser(null);
    setRecords([]);
    localStorage.removeItem('token');
  };

  // 當用戶登入後獲取記錄
  useEffect(() => {
    if (user) {
      fetchRecords();
    }
  }, [user]);

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '20px' }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>打卡系統</h1>
        
        {!user ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="用戶名"
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
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h2>歡迎, {user.name}</h2>
              <p>角色: {user.role === 'admin' ? '管理員' : '一般用戶'}</p>
              <button
                onClick={handleLogout}
                style={{
                  padding: '5px 10px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginTop: '10px'
                }}
              >
                登出
              </button>
            </div>
            
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
              {records.length > 0 ? (
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
              ) : (
                <p style={{ textAlign: 'center', color: '#666' }}>
                  暫無打卡記錄
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
