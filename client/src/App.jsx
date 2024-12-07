import React, { useState, useEffect } from 'react';

// 班別選項
const SHIFT_OPTIONS = [
  { value: 'morning', label: '早班 (06:00-14:00)' },
  { value: 'middle', label: '中班 (14:00-22:00)' },
  { value: 'night', label: '晚班 (22:00-06:00)' }
];

// 班別時間配置 (簡化後)
const SHIFT_CONFIG = {
  morning: {
    label: '早班 (06:00-14:00)',
    startTime: {
      hour: 6,
      minute: 0
    },
    allowEarlyMinutes: 60  // 可提前60分鐘打卡
  },
  middle: {
    label: '中班 (14:00-22:00)',
    startTime: {
      hour: 14,
      minute: 0
    },
    allowEarlyMinutes: 60
  },
  night: {
    label: '晚班 (22:00-06:00)',
    startTime: {
      hour: 22,
      minute: 0
    },
    allowEarlyMinutes: 60
  }
};

// 管理員面板組件
function AdminPanel({ token }) {
  const [userList, setUserList] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState({
    users: false,
    records: false,
    exporting: false  // 新增匯出狀態
  });
  const [error, setError] = useState({
    users: '',
    records: ''
  });
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    userId: '',
    type: '',
    shift: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 獲取用戶列表
  const fetchUsers = async () => {
    setLoading(prev => ({ ...prev, users: true }));
    setError(prev => ({ ...prev, users: '' }));
    try {
      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUserList(data);
      } else {
        setError(prev => ({ ...prev, users: '獲取用戶列表失敗' }));
        console.error('獲取用戶列表失敗:', response.statusText);
      }
    } catch (err) {
      setError(prev => ({ ...prev, users: '獲取用戶列表失敗' }));
      console.error('獲取用戶列表失敗:', err);
    } finally {
      setLoading(prev => ({ ...prev, users: false }));
    }
  };

  // 獲取考勤記錄
  const fetchAttendanceRecords = async () => {
    setLoading(prev => ({ ...prev, records: true }));
    setError(prev => ({ ...prev, records: '' }));
    try {
      const queryParams = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        type: filters.type,
        shift: filters.shift,
        page: currentPage,
        limit: ITEMS_PER_PAGE
      }).toString();

      const response = await fetch(`/api/admin/records?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(prev => ({ ...prev, records: '獲取考勤記錄失敗' }));
        setRecords([]);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('獲取考勤記錄失敗:', err);
      setError(prev => ({ ...prev, records: '獲取考勤記錄失敗' }));
      setRecords([]);
      setTotalPages(1);
    } finally {
      setLoading(prev => ({ ...prev, records: false }));
    }
  };

  // 匯出考勤記錄為 CSV
  const exportToCSV = async () => {
    try {
      setLoading(prev => ({ ...prev, exporting: true }));

      // 使用當前篩選條件獲取所有記錄
      const queryParams = new URLSearchParams({
        startDate: filters.startDate,
        endDate: filters.endDate,
        userId: filters.userId,
        type: filters.type,
        shift: filters.shift,
        exportAll: 'true'  // 告訴後端要導出所有記錄
      }).toString();

      const response = await fetch(`/api/admin/records/export?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const allRecords = await response.json();

        // 生成 CSV 內容
        const headers = ['員工姓名', '班別', '打卡類型', '打卡時間', '位置'];
        const csvContent = [
          headers.join(','),
          ...allRecords.map(record => [
            `"${record.userName}"`,  // 防止逗號造成問題
            `"${SHIFT_OPTIONS.find(opt => opt.value === record.userShift)?.label || '未指定'}"`,
            `"${record.type === 'clockIn' ? '上班' : '下班'}"`,
            `"${new Date(record.timestamp).toLocaleString()}"`,
            record.location && record.location.latitude && record.location.longitude
              ? `"${record.location.latitude.toFixed(6)},${record.location.longitude.toFixed(6)}"`
              : `"-"`
          ].join(','))
        ].join('\n');

        // 創建並下載文件
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `考勤記錄_${filters.startDate}_${filters.endDate}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        alert('導出成功！');
      } else {
        throw new Error('導出失敗');
      }
    } catch (err) {
      console.error('導出失敗:', err);
      alert('導出失敗，請稍後重試');
    } finally {
      setLoading(prev => ({ ...prev, exporting: false }));
    }
  };

  // 更新用戶班別
  const handleUpdateShift = async (userId, newShift) => {
    // 添加用戶ID的錯誤檢查
    if (!userId) {
      console.error('用戶ID不存在');
      alert('更新班別失敗：用戶ID不存在');
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shift: newShift })
      });
      if (response.ok) {
        fetchUsers();  // 重新獲取用戶列表
        alert('班別更新成功');
      } else {
        const data = await response.json();
        throw new Error(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新班別失敗');
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAttendanceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAttendanceRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, currentPage]);

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
      {/* 管理面板標題與匯出按鈕 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '20px' 
      }}>
        <h2>管理員面板</h2>
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
          disabled={loading.records || loading.exporting || records.length === 0}
        >
          {loading.exporting ? '匯出中...' : '匯出考勤記錄'}
        </button>
      </div>

      {/* 用戶管理 */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
        <h3>用戶管理</h3>
        {loading.users ? (
          <p>載入用戶...</p>
        ) : error.users ? (
          <p style={{ color: 'red' }}>{error.users}</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>姓名</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>班別</th>
                <th style={{ border: '1px solid #ddd', padding: '8px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {userList.map(user => (
                <tr key={user._id}>  {/* 修改這裡 */}
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>{user.name}</td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    <select
                      value={user.shift}
                      onChange={(e) => handleUpdateShift(user._id, e.target.value)}  {/* 修改這裡 */}
                      style={{ padding: '4px' }}
                    >
                      {SHIFT_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                    {/* 可以在這裡添加更多操作，如刪除用戶等 */}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 考勤記錄查詢 */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px' }}>
        <h3>考勤記錄查詢</h3>

        {/* 篩選器 UI */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <label>開始日期: </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              style={{ padding: '4px' }}
            />
          </div>
          <div>
            <label>結束日期: </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              style={{ padding: '4px' }}
            />
          </div>
          <div>
            <label>員工: </label>
            <select
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="">所有員工</option>
              {userList.map(user => (
                <option key={user._id} value={user._id}>{user.name}</option>  {/* 修改 key 為 _id */}
              ))}
            </select>
          </div>
          <div>
            <label>打卡類型: </label>
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="">所有類型</option>
              <option value="clockIn">上班</option>
              <option value="clockOut">下班</option>
            </select>
          </div>
          <div>
            <label>班別: </label>
            <select
              value={filters.shift}
              onChange={(e) => setFilters({ ...filters, shift: e.target.value })}
              style={{ padding: '4px' }}
            >
              <option value="">所有班別</option>
              {SHIFT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        {loading.records ? (
          <p>載入考勤記錄...</p>
        ) : error.records ? (
          <p style={{ color: 'red' }}>{error.records}</p>
        ) : records.length > 0 ? (
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>員工姓名</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>班別</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>打卡類型</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>打卡時間</th>
                  <th style={{ border: '1px solid #ddd', padding: '8px' }}>位置</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={record._id || index}>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>{record.userName}</td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {SHIFT_OPTIONS.find(opt => opt.value === record.userShift)?.label || '未指定'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {record.type === 'clockIn' ? '上班' : '下班'}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {new Date(record.timestamp).toLocaleString()}
                    </td>
                    <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                      {record.location && record.location.latitude && record.location.longitude
                        ? `${record.location.latitude.toFixed(6)}, ${record.location.longitude.toFixed(6)}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* 分頁控制 */}
            <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                style={{ padding: '6px 12px', marginRight: '10px' }}
              >
                上一頁
              </button>
              <span>第 {currentPage} 頁 / 共 {totalPages} 頁</span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{ padding: '6px 12px', marginLeft: '10px' }}
              >
                下一頁
              </button>
            </div>
          </div>
        ) : (
          <p>暫無考勤記錄</p>
        )}
      </div>
    </div>
  );
}

// 一般用戶面板組件
function UserPanel({ user, lastClockType, handleLogout, token }) {
  const [records, setRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [errorRecords, setErrorRecords] = useState('');
  const [lateMinutes, setLateMinutes] = useState(0); // 新增遲到分鐘數

  // 檢查是否遲到
  const calculateLateMinutes = (clockInTime) => {
    const config = SHIFT_CONFIG[user.shift];
    if (!config) return 0;

    const clockInDate = new Date(clockInTime);
    const clockInHour = clockInDate.getHours();
    const clockInMinute = clockInDate.getMinutes();
    const startHour = config.startTime.hour;
    const startMinute = config.startTime.minute;

    if (clockInHour > startHour || 
        (clockInHour === startHour && clockInMinute > startMinute)) {
      return (clockInHour - startHour) * 60 + (clockInMinute - startMinute);
    }
    
    return 0;
  };

  // 檢查打卡時間是否有效
  const checkTime = (type, currentTime) => {
    const config = SHIFT_CONFIG[user.shift];
    if (!config) return false;

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    
    if (type === 'clockIn') {
      // 計算最早可打卡時間
      const earliestTime = {
        hour: config.startTime.hour,
        minute: config.startTime.minute - config.allowEarlyMinutes
      };
      
      // 計算最晚可打卡時間，默認不允許遲到
      const latestTime = {
        hour: config.startTime.hour,
        minute: config.startTime.minute
      };

      // 處理分鐘數可能為負的情況
      let adjustedEarliestHour = earliestTime.hour;
      let adjustedEarliestMinute = earliestTime.minute;
      if (earliestTime.minute < 0) {
        adjustedEarliestHour -= 1;
        adjustedEarliestMinute += 60;
      }

      // 不允許遲到，所以打卡時間必須在 earliestTime 和 latestTime 之間
      const isAfterEarliest = currentHour > adjustedEarliestHour || 
                               (currentHour === adjustedEarliestHour && currentMinute >= adjustedEarliestMinute);
      const isBeforeLatest = currentHour < latestTime.hour || 
                              (currentHour === latestTime.hour && currentMinute <= latestTime.minute);

      return isAfterEarliest && isBeforeLatest;
    } else {
      // 下班打卡時間檢查已被移除，直接允許下班打卡
      return true;
    }
  };

  // 自動檢查未打卡
  useEffect(() => {
    let checkInterval;
    if (lastClockType === 'clockIn') {
      checkInterval = setInterval(() => {
        const lastClockInRecord = records.find(record => record.type === 'clockIn');
        const lastClockInTime = lastClockInRecord?.timestamp;
        if (lastClockInTime) {
          const hoursElapsed = (new Date() - new Date(lastClockInTime)) / (1000 * 60 * 60);
          if (hoursElapsed >= 12) {
            // 自動記錄忘記打卡
            handleAutoClockOut(lastClockInTime);
          }
        }
      }, 60000); // 每分鐘檢查一次
    }
    return () => clearInterval(checkInterval);
  }, [lastClockType, records]);

  // 自動打下班卡
  const handleAutoClockOut = async (clockInTime) => {
    try {
      const response = await fetch('/api/attendance/auto-clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clockInTime,
          note: '忘記打下班卡'
        })
      });

      if (response.ok) {
        // 重置為可打上班卡狀態
        setLastClockType(null);
        fetchUserRecords(); // 重新獲取記錄
        alert('系統檢測到您超過12小時未打卡，已自動記錄為忘記打下班卡');
      }
    } catch (error) {
      console.error('自動打卡失敗:', error);
    }
  };

  // 獲取用戶的打卡記錄
  const fetchUserRecords = async () => {
    setLoadingRecords(true);
    setErrorRecords('');
    try {
      const response = await fetch('/api/attendance/records', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.records);
      } else {
        setErrorRecords('獲取打卡記錄失敗');
        setRecords([]);
      }
    } catch (err) {
      console.error('獲取打卡記錄失敗:', err);
      setErrorRecords('獲取打卡記錄失敗');
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  // 修改打卡邏輯
  const handleClock = async (type) => {
    // 檢查是否符合打卡順序
    if (type === 'clockIn' && lastClockType === 'clockIn') {
      alert('請先進行下班打卡');
      return;
    }
    if (type === 'clockOut' && lastClockType !== 'clockIn') {
      alert('請先進行上班打卡');
      return;
    }

    const currentDate = new Date();
    
    // 檢查打卡時間是否有效
    if (!checkTime(type, currentDate)) {
      if (type === 'clockIn') {
        alert('不在允許的上班打卡時間範圍內');
      } else {
        alert('不在允許的下班打卡時間範圍內');
      }
      return;
    }

    // 計算遲到時間
    let late = 0;
    if (type === 'clockIn') {
      late = calculateLateMinutes(currentDate);
      setLateMinutes(late);
      if (late > 0) {
        alert(`您已遲到 ${late} 分鐘`);
      }
    }

    // 獲取位置
    let location = null;
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
    } catch (err) {
      const proceed = window.confirm(
        '無法獲取位置資訊。是否繼續打卡？（建議允許位置權限以保持完整記錄）'
      );
      if (!proceed) return;
    }

    // 發送打卡請求
    try {
      const response = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          type,
          location,
          lateMinutes: type === 'clockIn' ? late : 0 // 傳遲到分鐘數
        })
      });

      if (response.ok) {
        setLastClockType(type === 'clockIn' ? 'clockIn' : null); // 更新打卡狀態
        alert(type === 'clockIn' ? '上班打卡成功' : '下班打卡成功');
        fetchUserRecords(); // 重新獲取記錄
      } else {
        const data = await response.json();
        alert(data.message || '打卡失敗');
      }
    } catch (error) {
      console.error('打卡失敗:', error);
      alert('打卡失敗，請稍後重試');
    }
  };

  useEffect(() => {
    fetchUserRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchUserRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastClockType]);

  return (
    <div style={{ marginTop: '20px', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
      <h2 style={{ marginBottom: '20px' }}>用戶面板</h2>

      {/* 一般用戶顯示區塊 */}
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
        <h3>歡迎, {user.name}</h3>
        <div style={{ marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
          <p>角色: 一般用戶</p>
          <p style={{ color: '#1976d2', fontWeight: 'bold' }}>
            班別: {SHIFT_OPTIONS.find(opt => opt.value === user.shift)?.label || '未指定'}
          </p>
        </div>
        <button onClick={handleLogout} style={{ marginTop: '10px', padding: '8px 16px', background: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          登出
        </button>
      </div>

      {/* 打卡按鈕 */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '20px' }}>
        <button
          onClick={() => handleClock('clockIn')}
          disabled={lastClockType === 'clockIn'}
          style={{
            padding: '10px 20px',
            background: lastClockType === 'clockIn' ? '#ccc' : '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: lastClockType === 'clockIn' ? 'not-allowed' : 'pointer'
          }}
        >
          上班打卡
        </button>

        <button
          onClick={() => handleClock('clockOut')}
          disabled={lastClockType !== 'clockIn'}
          style={{
            padding: '10px 20px',
            background: lastClockType !== 'clockIn' ? '#ccc' : '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: lastClockType !== 'clockIn' ? 'not-allowed' : 'pointer'
          }}
        >
          下班打卡
        </button>
      </div>

      {/* 前端顯示時間規則 */}
      <div style={{ textAlign: 'center', marginBottom: '10px', color: '#666' }}>
        <p>班別時間：{SHIFT_CONFIG[user.shift]?.label}</p>
        <p>可提前打卡：{SHIFT_CONFIG[user.shift]?.allowEarlyMinutes} 分鐘</p>
      </div>

      {/* 考勤記錄 */}
      <div>
        <h3>打卡記錄</h3>
        {loadingRecords ? (
          <p>載入打卡記錄...</p>
        ) : errorRecords ? (
          <p style={{ color: 'red' }}>{errorRecords}</p>
        ) : records.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {records.map((record, index) => (
              <div key={record._id || index} style={{ padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{record.type === 'clockIn' ? '上班' : '下班'}</span>
                  <span>{new Date(record.timestamp).toLocaleString()}</span>
                </div>
                {record.location && record.location.latitude && record.location.longitude && (
                  <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
                    位置: {record.location.latitude.toFixed(6)}, {record.location.longitude.toFixed(6)}
                  </div>
                )}
                {/* 顯示遲到時間 */}
                {record.type === 'clockIn' && record.lateMinutes > 0 && (
                  <div style={{ fontSize: '0.9em', color: 'red', marginTop: '4px' }}>
                    遲到: {record.lateMinutes} 分鐘
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>暫無打卡記錄</p>
        )}
      </div>
    </div>
  );
}

// 主應用組件
function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastClockType, setLastClockType] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            setLastClockType(data.lastClockType);
          } else {
            localStorage.removeItem('token');
          }
        })
        .catch(() => {
          localStorage.removeItem('token');
        });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data.user);
        localStorage.setItem('token', data.token);
        setLastClockType(data.lastClockType);
      } else {
        setError(data.message || '登入失敗');
      }
    } catch (err) {
      setError('登入失敗');
      console.error('登入錯誤:', err);
    } finally {
      setLoading(false);
    }
  };

  // handleClock 已移至 UserPanel 組件中

  const handleLogout = () => {
    setUser(null);
    setLastClockType(null);
    localStorage.removeItem('token');
  };

  return (
    <div style={{ padding: '20px' }}>
      {!user ? (
        <form onSubmit={handleLogin} style={{ maxWidth: '300px', margin: '0 auto' }}>
          <h2>登入</h2>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              placeholder="用戶名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="password"
              placeholder="密碼"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
            {loading ? '登入中...' : '登入'}
          </button>
        </form>
      ) : user.role === 'admin' ? (
        <AdminPanel token={localStorage.getItem('token')} />
      ) : (
        <UserPanel
          user={user}
          lastClockType={lastClockType}
          handleLogout={handleLogout}
          token={localStorage.getItem('token')}
        />
      )}
    </div>
  );
}

export default App;
