console.log('KNOCK Popup loading...');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, adding event listeners...');

  // 룸메이트 카드 클릭
  document.getElementById('alex-card').addEventListener('click', function() {
    console.log('Alex clicked!');
    alert('Alex와 채팅하기!');
  });

  document.getElementById('emma-card').addEventListener('click', function() {
    console.log('Emma clicked!');
    alert('Emma와 채팅하기!');
  });

  document.getElementById('james-card').addEventListener('click', function() {
    console.log('James clicked!');
    alert('James와 채팅하기!');
  });

  // 건물 보기 버튼
  document.getElementById('open-building-btn').addEventListener('click', function() {
    console.log('Opening building view...');
    chrome.tabs.create({ url: 'http://localhost:3002' });
  });

  // 노크하기 버튼
  document.getElementById('knock-btn').addEventListener('click', function() {
    console.log('Knock button clicked!');
    alert('노크 기능 준비중입니다!');
  });

  console.log('All event listeners added successfully!');
});
