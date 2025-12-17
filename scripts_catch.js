// --- CẤU HÌNH ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Audio
const bgMusic = document.getElementById('bgMusic');
const scoreSound = document.getElementById('scoreSound');
const bombSound = document.getElementById('bombSound');

// Elements
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');

// Biến game
let gameRunning = false;
let score = 0;
let lives = 3;
let frameCount = 0;
let difficulty = 1; // Tăng dần theo thời gian

// Player (Cái giỏ)
const player = {
    x: 0,
    y: 0,
    width: 80,
    height: 80,
    speed: 15, // Tốc độ di chuyển
    icon: '🛒'
};

// Mảng chứa các vật phẩm đang rơi
let items = [];
// Mảng chứa hiệu ứng điểm số bay lên
let floatingTexts = [];

// Định nghĩa các loại vật phẩm
const itemTypes = [
    { type: 'gift', icon: '🎁', points: 10, speed: 3, weight: 60 },   // Phổ biến
    { type: 'coin', icon: '💰', points: 20, speed: 4, weight: 30 },   // Hiếm hơn
    { type: 'diamond', icon: '💎', points: 50, speed: 6, weight: 10 }, // Siêu hiếm
    { type: 'bomb', icon: '💣', points: 0, speed: 5, weight: 20 }     // Nguy hiểm
];

// --- HÀM HỆ THỐNG ---

// Resize canvas full màn hình
function resizeCanvas() {
    canvas.width = document.querySelector('.game-container').offsetWidth;
    canvas.height = document.querySelector('.game-container').offsetHeight;
    // Đặt lại vị trí player xuống đáy
    player.y = canvas.height - 90;
    // Nếu player chưa có vị trí x, đặt giữa
    if (player.x === 0) player.x = canvas.width / 2 - player.width / 2;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Điều khiển: Bàn phím
let keys = {};
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Điều khiển: Chuột / Cảm ứng (Di chuyển theo chiều ngang con trỏ)
canvas.addEventListener('mousemove', e => {
    if (!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    player.x = e.clientX - rect.left - player.width / 2;
});

canvas.addEventListener('touchmove', e => {
    if (!gameRunning) return;
    e.preventDefault(); // Chặn cuộn trang
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    player.x = touch.clientX - rect.left - player.width / 2;
}, { passive: false });

// Hàm Random có trọng số (để Quà ra nhiều hơn Bom)
function getRandomItemType() {
    const totalWeight = itemTypes.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const item of itemTypes) {
        if (random < item.weight) return item;
        random -= item.weight;
    }
    return itemTypes[0];
}

// --- LOGIC GAME LOOP ---

function startGame() {
    // Reset biến
    score = 0;
    lives = 3;
    difficulty = 1;
    items = [];
    floatingTexts = [];
    gameRunning = true;
    
    updateUI();
    
    // UI toggle
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
    // Âm thanh
    bgMusic.currentTime = 0;
    bgMusic.volume = 0.3;
    bgMusic.play().catch(e => console.log("Click để phát nhạc"));

    // Bắt đầu vòng lặp
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameRunning = false;
    bgMusic.pause();
    bombSound.play(); // Tiếng nổ cuối cùng
    finalScoreEl.innerText = score;
    gameOverScreen.classList.remove('hidden');
}

function spawnItem() {
    const typeData = getRandomItemType();
    const item = {
        ...typeData, // Copy thuộc tính (icon, speed, points...)
        x: Math.random() * (canvas.width - 50),
        y: -50,
        size: 50
    };
    items.push(item);
}

function update() {
    // 1. Di chuyển Player (nếu dùng phím)
    if (keys['ArrowLeft']) player.x -= player.speed;
    if (keys['ArrowRight']) player.x += player.speed;

    // Giới hạn khung hình
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // 2. Sinh ra vật phẩm (Tần suất phụ thuộc độ khó)
    // Cứ khoảng 60 frame (1 giây) thì random sinh ra, càng khó càng nhanh
    if (frameCount % Math.max(20, 60 - Math.floor(difficulty * 2)) === 0) {
        spawnItem();
    }

    // 3. Cập nhật vật phẩm rơi
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        // Tăng tốc độ rơi theo độ khó
        item.y += item.speed + (difficulty * 0.5);

        // -- KIỂM TRA VA CHẠM --
        // Đơn giản hóa: Coi player và item là hình chữ nhật
        if (
            item.x < player.x + player.width &&
            item.x + item.size > player.x &&
            item.y < player.y + player.height &&
            item.y + item.size > player.y
        ) {
            // Đã chạm!
            handleCatch(item);
            items.splice(i, 1); // Xóa khỏi mảng
            i--;
            continue;
        }

        // -- RƠI RA NGOÀI --
        if (item.y > canvas.height) {
            items.splice(i, 1);
            i--;
        }
    }

    // 4. Cập nhật hiệu ứng chữ bay
    for (let i = 0; i < floatingTexts.length; i++) {
        floatingTexts[i].y -= 1; // Bay lên
        floatingTexts[i].life--;
        if (floatingTexts[i].life <= 0) {
            floatingTexts.splice(i, 1);
            i--;
        }
    }

    // Tăng độ khó nhẹ nhàng
    if (frameCount % 600 === 0) difficulty += 0.5; // Mỗi 10 giây tăng khó
    frameCount++;
}

function handleCatch(item) {
    if (item.type === 'bomb') {
        // Ăn phải bom
        lives--;
        bombSound.currentTime = 0;
        bombSound.play();
        // Hiệu ứng rung màn hình
        canvas.style.transform = "translate(5px, 5px)";
        setTimeout(() => canvas.style.transform = "none", 100);

        if (lives <= 0) endGame();
    } else {
        // Ăn được quà
        score += item.points;
        scoreSound.currentTime = 0;
        scoreSound.play();
        
        // Tạo hiệu ứng chữ bay (+10)
        floatingTexts.push({
            text: `+${item.points}`,
            x: player.x + player.width/2,
            y: player.y,
            color: '#f1c40f',
            life: 30 // Tồn tại trong 30 frame
        });
    }
    updateUI();
}

function updateUI() {
    scoreEl.innerText = score;
    // Vẽ số trái tim
    livesEl.innerText = "❤️".repeat(Math.max(0, lives));
}

function draw() {
    // Xóa màn hình cũ
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Vẽ Player
    ctx.font = `${player.width}px Arial`;
    ctx.fillText(player.icon, player.x, player.y + player.height - 10);

    // Vẽ Vật phẩm
    for (let item of items) {
        ctx.font = `${item.size}px Arial`;
        ctx.fillText(item.icon, item.x, item.y + item.size);
    }

    // Vẽ hiệu ứng chữ bay
    for (let ft of floatingTexts) {
        ctx.fillStyle = ft.color;
        ctx.font = "bold 24px Arial";
        ctx.fillText(ft.text, ft.x, ft.y);
    }
}

function gameLoop() {
    if (!gameRunning) return;
    
    update();
    draw();
    
    requestAnimationFrame(gameLoop);
}
