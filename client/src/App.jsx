// client/src/App.jsx
import React, { useState, useEffect } from 'react';

const App = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '', role: 'employee' });
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [records, setRecords] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  // 登入功能
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await response.json();
      if (data.user.role === 'admin') {
        setIsAdmin(true);
        localStorage.setItem('token', data.token);
        fetchUsers();
      } else {
        alert('只有管理員可以使用此系統');
      }
    } catch (error) {
      alert('登入失敗');
    }
  };

  // 獲取所有用戶
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('獲取用戶失敗:', error);
    }
  };

  // 創建新用戶
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser),
      });
      if (response.ok) {
        alert('用戶創建成功');
        setNewUser({ username: '', password: '', name: '', role: 'employee' });
        fetchUsers();
      }
    } catch (error) {
      alert('創建用戶失敗');
    }
  };

  // 獲取特定用戶的打卡記錄
  const fetchUserRecords = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/records/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setRecords(data);
      setSelectedUser(users.find(u => u._id === userId));
    } catch (error) {
      console.error('獲取記錄失敗:', error);
    }
  };

  // 手動打卡
  const handleManualClock = async (userId, type) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/admin/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, type }),
      });
      fetchUserRecords(userId);
    } catch (error) {
      alert('打卡失敗');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {!isAdmin ? (
        // 管理員登入表單
        <div style={{ maxWidth: '400px', margin: '40px auto' }}>
          <h2 style={{ marginBottom: '20px' }}>管理員登入</h2>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="用戶名"
              value={loginData.username}
              onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
              style={{ padding: '8px' }}
            />
            <input
              type="password"
              placeholder="密碼"
              value={loginData.password}
              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
              style={{ padding: '8px' }}
            />
            <button type="submit" style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none' }}>
              登入
            </button>
          </form>
        </div>
      ) : (
        // 管理後台
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* 左側：用戶管理 */}
          <div>
            <h2>創建新用戶</h2>
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="用戶名"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                style={{ padding: '8px' }}
              />
              <input
                type="password"
                placeholder="密碼"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                style={{ padding: '8px' }}
              />
              <input
                type="text"
                placeholder="姓名"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                style={{ padding: '8px' }}
              />
              <button type="submit" style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none' }}>
                創建用戶
              </button>
            </form>

            <h2>用戶列表</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(user => (
                <div 
                  key={user._id} 
                  style={{ 
                    padding: '10px', 
                    border: '1px solid #ddd',
                    cursor: 'pointer',
                    background: selectedUser?._id === user._id ? '#e3f2fd' : 'white'
                  }}
                  onClick={() => fetchUserRecords(user._id)}
                >
                  <div>{user.name} ({user.username})</div>
                </div>
              ))}
            </div>
          </div>

          {/* 右側：打卡記錄和管理 */}
          <div>
            {selectedUser && (
              <>
                <h2>{selectedUser.name} 的打卡管理</h2>
                <div style={{ marginBottom: '20px' }}>
                  <button
                    onClick={() => handleManualClock(selectedUser._id, 'clockIn')}
                    style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', marginRight: '10px' }}
                  >
                    上班打卡
                  </button>
                  <button
                    onClick={() => handleManualClock(selectedUser._id, 'clockOut')}
                    style={{ padding: '10px', background: '#2196F3', color: 'white', border: 'none' }}
                  >
                    下班打卡
                  </button>
                </div>

                <h3>打卡記錄</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {records.map((record, index) => (
                    <div key={index} style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <div>類型: {record.type === 'clockIn' ? '上班' : '下班'}</div>
                      <div>時間: {new Date(record.timestamp).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;