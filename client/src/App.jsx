import React, { useState, useEffect } from 'react';

// 管理員面板組件
function AdminPanel({ token }) {
  // 狀態管理
  const [newUser, setNewUser] = useState({ username: '', password: '', name: '' });
  const [userList, setUserList] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState({
    users: false,
    records: false,
    creating: false
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userId: '',
    type: ''
  });
  const [error, setError] = useState({
    users: '',
    records: '',
    creating: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 數據驗證
  const validateNewUser = () => {
    if (newUser.password.length < 6) {
      setError({ ...error, creating: '密碼長度至少需要6個字符' });
      return false;
    }
    if (newUser.username.length < 3) {
      setError({ ...error, creating: '用戶名長度至少需要3個字符' });
      return false;
    }
    return true;
  };

  // 創建新用戶
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateNewUser()) return;

    setLoading({ ...loading, creating: true });
    setError({ ...error, creating: '' });

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setNewUser({ username: '', password: '', name: '' });
        fetchUsers();
        alert('用戶創建成功');
      } else {
        setError({ ...error, creating: data.message || '創建用戶失敗' });
      }
    } catch (error) {
      setError({ ...error, creating: '網絡錯誤，請稍後重試' });
      console.error('創建用戶錯誤:', error);
    } finally {
      setLoading({ ...loading, creating: false });
    }
  };

  // 獲取用戶列表
  const fetchUsers = async () => {
    setLoading({ ...loading, users: true });
    setError({ ...error, users: '' });
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserList(data);
      } else {
        setError({ ...error, users: '獲取用戶列表失敗' });
        console.error('獲取用戶列表失敗:', response.statusText);
      }
    } catch (error) {
      setError({ ...error, users: '獲取用戶列表失敗' });
      console.error('獲取用戶列表失敗:', error);
    } finally {
      setLoading({ ...loading, users: false });
    }
  };

  // 獲取考勤記錄（管理員）
  const fetchAttendanceRecords = async () => {
    setLoading({ ...loading, records: true });
    setError({ ...error, records: '' });
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        page: currentPage,
        limit: ITEMS_PER_PAGE
      });
      const response = await fetch(`/api/admin/records?${queryParams}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records || []);
        setTotalPages(Math.ceil((data.total || 0) / ITEMS_PER_PAGE));
      } else {
        setError({ ...error, records: '獲取考勤記錄失敗' });
        setRecords([]);
        console.error('獲取考勤記錄失敗:', response.statusText);
      }
    } catch (error) {
      console.error('獲取考勤記錄失敗:', error);
      setError({ ...error, records: '獲取考勤記錄失敗' });
      setRecords([]);
    } finally {
      setLoading({ ...loading, records: false });
    }
  };

  // 匯出考勤記錄為CSV
  const exportToCSV = () => {
    const headers = ['員工姓名', '打卡類型', '打卡時間', '位置'];
    const csvContent = [
      headers.join(','),
      ...records.map(record => [
        record.userName,
        record.type === 'clockIn' ? '上班' : '下班',
        new Date(record.timestamp).toLocaleString(),
        record.location ? `${record.location.latitude},${record.location.longitude}` : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `考勤記錄_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  // 初始化獲取用戶列表和考勤記錄
  useEffect(() => {
    fetchUsers();
  }, []);

  // 當篩選條件或當前頁數改變時，重新獲取考勤記錄
  useEffect(() => {
    fetchAttendanceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        管理員面板
        <button
          onClick={exportToCSV}
          style={{
            padding: '8px 16px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
          disabled={records.length === 0}
        >
          匯出考勤記錄
        </button>
      </h2>
      
      {/* 用戶管理區塊 */}
      <div style={{ 
        background: 'white', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
      }}>
        <h3>用戶管理</h3>
        <div style={{ marginBottom: '20px' }}>
          <h4>創建新用戶</h4>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              type="text"
              placeholder="用戶名"
              value={newUser.username}
              onChange={(e) => setNewUser({...newUser, username: e.target.value})}
              required
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="password"
              placeholder="密碼"
              value={newUser.password}
              onChange={(e) => setNewUser({...newUser, password: e.target.value})}
              required
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            <input
              type="text"
              placeholder="姓名"
              value={newUser.name}
              onChange={(e) => setNewUser({...newUser, name: e.target.value})}
              required
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
            {error.creating && (
              <div style={{ color: '#c62828', fontSize: '14px' }}>
                {error.creating}
              </div>
            )}
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
              disabled={loading.creating}
            >
              {loading.creating ? '創建中...' : '創建用戶'}
            </button>
          </form>
        </div>

        <div>
          <h4>用戶列表</h4>
          {loading.users ? (
            <p>加載中...</p>
          ) : error.users ? (
            <p style={{ color: '#c62828' }}>{error.users}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {userList.map((user) => (
                <div 
                  key={user.id || user._id}
                  style={{
                    padding: '10px',
                    background: '#f5f5f5',
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div>姓名: {user.name}</div>
                    <div>用戶名: {user.username}</div>
                    <div>角色: {user.role === 'admin' ? '管理員' : '一般用戶'}</div>
                  </div>
                  {/* 如果需要，可以在這裡添加編輯或刪除用戶的按鈕 */}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 考勤記錄區塊 - 添加分頁控制 */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3>考勤記錄查詢</h3>
        
        {/* 篩選器 */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>開始日期:</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>結束日期:</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>員工:</label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({...filters, userId: e.target.value})}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">所有員工</option>
              {userList.map(user => (
                <option key={user.id || user._id} value={user.id || user._id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>打卡類型:</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({...filters, type: e.target.value})}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="">全部類型</option>
              <option value="clockIn">上班打卡</option>
              <option value="clockOut">下班打卡</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              onClick={() => { setCurrentPage(1); fetchAttendanceRecords(); }}
              style={{
                padding: '10px 20px',
                background: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                height: '40px'
              }}
            >
              查詢
            </button>
          </div>
        </div>

        {/* 考勤記錄表格 */}
        <div style={{ overflowX: 'auto' }}>
          {loading.records ? (
            <p>加載中...</p>
          ) : error.records ? (
            <p style={{ color: '#c62828' }}>{error.records}</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>員工姓名</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>打卡類型</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>打卡時間</th>
                  <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>位置</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map((record) => (
                    <tr key={record._id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{record.userName}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {record.type === 'clockIn' ? '上班' : '下班'}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>{new Date(record.timestamp).toLocaleString()}</td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {record.location ? 
                          `${record.location.latitude}, ${record.location.longitude}` : 
                          '-'
                        }
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ padding: '12px', textAlign: 'center', color: '#666' }}>
                      暫無考勤記錄
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* 分頁控制 */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                background: currentPage === 1 ? '#f5f5f5' : '#e0e0e0',
                cursor: currentPage === 1 ? 'default' : 'pointer'
              }}
            >
              上一頁
            </button>
            <span>第 {currentPage} 頁，共 {totalPages} 頁</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              style={{
                padding: '5px 10px',
                border: 'none',
                borderRadius: '4px',
                background: currentPage === totalPages ? '#f5f5f5' : '#e0e0e0',
                cursor: currentPage === totalPages ? 'default' : 'pointer'
              }}
            >
              下一頁
            </button>
          </div>
        )}
      </div>

      {/* 錯誤提示 */}
      {Object.values(error).some(err => err) && (
        <div style={{
          padding: '10px',
          background: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginTop: '20px'
        }}>
          {Object.values(error).filter(err => err).join(', ')}
        </div>
      )}
    </div>
  );
}

// 主應用組件
function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [records, setRecords] = useState([]); // 確保 records 初始狀態是陣列
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 登入處理
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
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
        fetchRecords(data.token);
      } else {
        setError(data.message || '登入失敗');
      }
    } catch (error) {
      setError('登入失敗');
      console.error('登入錯誤:', error);
    } finally {
      setLoading(false);
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
        fetchRecords(token);
      } else {
        const data = await response.json();
        alert(data.message || '打卡失敗');
      }
    } catch (error) {
      alert('打卡失敗');
      console.error('打卡錯誤:', error);
    }
  };

  // 獲取打卡記錄（一般用戶）
  const fetchRecords = async (tokenParam = null) => {
    if (!user && !tokenParam) return;
    try {
      const token = tokenParam || localStorage.getItem('token');
      const response = await fetch('/api/attendance/records', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(Array.isArray(data) ? data : []);
      } else {
        console.error('獲取記錄失敗:', response.statusText);
        setRecords([]);
      }
    } catch (error) {
      console.error('獲取記錄失敗:', error);
      setRecords([]);
    }
  };

  // 登出處理
  const handleLogout = () => {
    setUser(null);
    setRecords([]);
    localStorage.removeItem('token');
  };

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
              required
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
            />
            {error && (
              <div style={{ color: '#c62828', fontSize: '14px' }}>
                {error}
              </div>
            )}
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
              disabled={loading}
            >
              {loading ? '登入中...' : '登入'}
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
            
            {/* 一般用戶的打卡功能 */}
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

            {/* 一般用戶的打卡記錄 */}
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

            {/* 管理員面板 */}
            {user.role === 'admin' && (
              <AdminPanel token={localStorage.getItem('token')} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
