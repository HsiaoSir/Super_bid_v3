let monitoringInterval = null;
let config = null;
let serverTimeOffset = 0;
let serverTimeSynced = false;
let hasAutoBid = false;
let priceUpdateInterval = null;

// 日誌功能
function createLogContainer() {
    // 檢查是否已存在
    let container = document.getElementById('bidding-assistant-log');
    if (container) {
        return container;
    }

    container = document.createElement('div');
    container.id = 'bidding-assistant-log';
    container.style.cssText = `
        position: fixed;
        left: 10px;
        bottom: 10px;
        width: 400px;
        max-height: 300px;
        background-color: rgba(0, 0, 0, 0.9);
        color: #fff;
        font-size: 12px;
        padding: 10px;
        border-radius: 5px;
        z-index: 999999;
        overflow-y: auto;
        font-family: monospace;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
    `;

    // 添加標題
    const title = document.createElement('div');
    title.style.cssText = `
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
    `;
    title.textContent = '下單助手監控日誌';
    container.appendChild(title);

    // 添加控制按鈕
    const controls = document.createElement('div');
    controls.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        display: flex;
        gap: 5px;
    `;

    // 清除按鈕
    const clearButton = document.createElement('button');
    clearButton.textContent = '清除';
    clearButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 2px 5px;
        font-size: 10px;
        cursor: pointer;
        transition: background-color 0.2s;
    `;
    clearButton.onmouseover = () => clearButton.style.backgroundColor = '#888';
    clearButton.onmouseout = () => clearButton.style.backgroundColor = '#666';
    clearButton.onclick = () => {
        const logContent = container.querySelector('.log-content');
        if (logContent) {
            logContent.innerHTML = '';
            log('日誌已清除', 'info');
        }
    };

    // 最小化按鈕
    const minimizeButton = document.createElement('button');
    minimizeButton.textContent = '−';
    minimizeButton.style.cssText = `
        background: #666;
        color: white;
        border: none;
        border-radius: 3px;
        padding: 2px 5px;
        font-size: 10px;
        cursor: pointer;
        transition: background-color 0.2s;
    `;
    minimizeButton.onmouseover = () => minimizeButton.style.backgroundColor = '#888';
    minimizeButton.onmouseout = () => minimizeButton.style.backgroundColor = '#666';
    minimizeButton.onclick = () => {
        const logContent = container.querySelector('.log-content');
        if (logContent) {
            if (logContent.style.display === 'none') {
                logContent.style.display = 'block';
                container.style.maxHeight = '300px';
                minimizeButton.textContent = '−';
                title.style.borderBottom = '1px solid rgba(255, 255, 255, 0.3)';
            } else {
                logContent.style.display = 'none';
                container.style.maxHeight = '40px';
                minimizeButton.textContent = '+';
                title.style.borderBottom = 'none';
            }
        }
    };

    controls.appendChild(minimizeButton);
    controls.appendChild(clearButton);
    container.appendChild(controls);

    // 創建日誌內容區域
    const logContent = document.createElement('div');
    logContent.className = 'log-content';
    logContent.style.cssText = `
        margin-top: 10px;
        height: calc(100% - 40px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        scroll-behavior: smooth;
    `;
    container.appendChild(logContent);

    document.body.appendChild(container);
    
    // 初始化日誌
    log('下單助手已啟動', 'info');
    log('版本: 1.0.1', 'info');
    log('正在分析頁面...', 'info');

    return container;
}

// 日誌類型的顏色配置
const LOG_COLORS = {
    info: '#4CAF50',    // 綠色
    error: '#F44336',   // 紅色
    warning: '#FFC107', // 黃色
    debug: '#2196F3',   // 藍色
    timing: '#9C27B0',  // 紫色
    bidding: '#FF5722'  // 橙色
};

// 添加日誌
function log(message, type = 'info') {
    const container = document.getElementById('bidding-assistant-log');
    if (!container) return;

    const logContent = container.querySelector('.log-content');
    if (!logContent) return;

    const logEntry = document.createElement('div');
    logEntry.style.cssText = `
        margin: 2px 0;
        padding: 3px 5px;
        border-radius: 3px;
        font-family: monospace;
        animation: fadeIn 0.3s ease;
        word-wrap: break-word;
        flex-shrink: 0;
    `;

    // 根據類型設置樣式
    switch (type) {
        case 'error':
            logEntry.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
            logEntry.style.color = '#ff6b6b';
            break;
        case 'warning':
            logEntry.style.backgroundColor = 'rgba(255, 165, 0, 0.2)';
            logEntry.style.color = '#ffd700';
            break;
        case 'success':
            logEntry.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
            logEntry.style.color = '#98ff98';
            break;
        case 'timing':
            logEntry.style.backgroundColor = 'rgba(0, 191, 255, 0.2)';
            logEntry.style.color = '#87cefa';
            break;
        case 'bidding':
            logEntry.style.backgroundColor = 'rgba(255, 105, 180, 0.2)';
            logEntry.style.color = '#ff69b4';
            break;
        case 'debug':
            logEntry.style.backgroundColor = 'rgba(128, 128, 128, 0.2)';
            logEntry.style.color = '#a9a9a9';
            break;
        default:
            logEntry.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }

    const timestamp = new Date().toLocaleTimeString('zh-TW', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        fractionalSecondDigits: 3
    });

    logEntry.textContent = `[${timestamp}] ${message}`;
    logContent.appendChild(logEntry);

    // 改進的自動捲動邏輯
    requestAnimationFrame(() => {
        const isScrolledToBottom = logContent.scrollHeight - logContent.clientHeight <= logContent.scrollTop + 1;
        if (isScrolledToBottom) {
            logContent.scrollTop = logContent.scrollHeight;
        }
    });

    // 限制日誌條目數量
    while (logContent.children.length > 100) {
        logContent.removeChild(logContent.firstChild);
    }

    // 同時在控制台輸出
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// 改進的價格級距計算函數
function calculatePriceStep(currentPrice) {
    // 根據臺北惜物網的價格規則調整級距
    if (currentPrice < 1000) {
        return 50;  // 小於1000元，每次加價50元
    } else if (currentPrice < 5000) {
        return 100; // 1000-5000元，每次加價100元
    } else if (currentPrice < 10000) {
        return 200; // 5000-10000元，每次加價200元
    } else if (currentPrice < 50000) {
        return 500; // 10000-50000元，每次加價500元
    } else {
        return 1000; // 50000元以上，每次加價1000元
    }
}

// 獲取可用的出價選項
function getAvailableBids() {
    try {
        // 獲取出價選單
        const bidSelect = document.getElementById('bidprice');
        if (!bidSelect) {
            log('找不到出價選單 (#bidprice)', 'error');
            return [];
        }

        // 獲取所有選項值並轉換為數字
        const bids = Array.from(bidSelect.options)
            .map(option => parseInt(option.value))
            .filter(price => !isNaN(price));

        if (bids.length === 0) {
            log('沒有可用的出價選項', 'error');
            return [];
        }

        // 獲取當前價格用於記錄
        const currentPrice = getCurrentPrice();
        if (currentPrice !== null) {
            const validBids = bids.filter(bid => bid > currentPrice);
            log(`當前價格：${currentPrice}元，可用出價選項：${bids.join(', ')}，有效選項：${validBids.join(', ')}`, 'debug');
        } else {
            log(`可用出價選項：${bids.join(', ')}`, 'debug');
        }

        return bids;
    } catch (error) {
        log('獲取出價選項時出錯：' + error.message, 'error');
        return [];
    }
}

// 執行下單
async function placeBid(price) {
    try {
        log('準備下單，價格：' + price, 'bidding');
        
        // 檢查出價區域是否存在
        const bidArea = document.getElementById('wholePriceHome');
        if (!bidArea) {
            throw new Error('找不到出價區域');
        }

        // 設置出價
        const bidSelect = document.getElementById('bidprice');
        if (!bidSelect) {
            throw new Error('找不到出價選單');
        }

        // 驗證價格是否在可選範圍內
        const availablePrices = Array.from(bidSelect.options).map(opt => parseInt(opt.value));
        if (!availablePrices.includes(price)) {
            throw new Error(`出價金額 ${price} 不在可選範圍內`);
        }

        // 設置價格值
        bidSelect.value = price;
        bidSelect.dispatchEvent(new Event('change', { bubbles: true }));

        // 使用精確的按鈕選擇器
        const bidButton = document.querySelector('#bidButton.btn.bg_blue2[title="確定出價"]');
        if (!bidButton) {
            throw new Error('找不到出價按鈕');
        }

        // 檢查按鈕是否可用
        if (bidButton.disabled) {
            throw new Error('出價按鈕已被禁用');
        }

        // 執行出價
        log('點擊出價按鈕', 'bidding');
        bidButton.click();

        // 監控出價結果
        await new Promise((resolve, reject) => {
            setTimeout(() => {
                const errorElement = document.querySelector('.error-message, .alert-danger');
                if (errorElement) {
                    reject(new Error('出價失敗：' + errorElement.textContent));
                } else {
                    resolve();
                }
            }, 1000);
        });

        log('出價成功送出', 'success');
        
        // 延遲重新載入頁面
        setTimeout(() => {
            location.reload();
        }, 2000);

    } catch (error) {
        log('下單時出錯：' + error.message, 'error');
        throw error; // 向上傳遞錯誤
    }
}

// 出價策略類型
const BidStrategy = {
    STEP_BID: 'stepBid',      // 級距出價
    SNIPE_BID: 'snipeBid'     // 劫鏢模式
};

// 獲取當前價格
function getCurrentPrice() {
    try {
        // 使用精確的價格元素選擇器
        const priceElement = document.querySelector('#txt_money');
        if (!priceElement) {
            log('找不到價格元素 (#txt_money)', 'error');
            return null;
        }

        // 從文本中提取數字
        const price = parseInt(priceElement.textContent.replace(/[^\d]/g, ''));
        if (isNaN(price)) {
            log('價格解析失敗：' + priceElement.textContent, 'error');
            return null;
        }

        // 獲取出價人數（用於記錄）
        const bidderCount = document.querySelector('#detailSize');
        if (bidderCount) {
            log(`當前價格：${price}元，共 ${bidderCount.textContent} 人出價`, 'info');
        } else {
            log(`當前價格：${price}元`, 'info');
        }

        return price;
    } catch (error) {
        log('獲取當前價格時出錯：' + error.message, 'error');
        return null;
    }
}

// 改進的出價執行函數
async function executeBid(strategy, stepCount, finalStepCount = null) {
    if (hasAutoBid) {
        log('已經執行過自動出價，跳過', 'warning');
        return;
    }

    try {
        // 獲取當前價格
        const currentPrice = getCurrentPrice();
        if (currentPrice === null) {
            throw new Error('無法獲取當前價格');
        }

        // 獲取可用的出價選項
        const bids = getAvailableBids();
        if (bids.length === 0) {
            throw new Error('沒有可用的出價選項');
        }

        // 過濾出高於當前價格的選項
        const validBids = bids.filter(bid => bid > currentPrice);
        if (validBids.length === 0) {
            throw new Error(`沒有高於當前價格(${currentPrice}元)的出價選項`);
        }

        // 根據策略選擇出價金額
        let selectedBid;
        if (strategy === BidStrategy.STEP_BID) {
            // 級距出價：選擇第 n 個級距的價格
            const targetIndex = Math.min(stepCount - 1, validBids.length - 1);
            selectedBid = validBids[targetIndex];
            log(`使用級距出價策略，選擇第 ${stepCount}/${validBids.length} 個級距：${selectedBid}（高於當前價格 ${selectedBid - currentPrice} 元）`, 'bidding');
        } else if (strategy === BidStrategy.SNIPE_BID) {
            // 劫鏢模式：根據當前階段選擇不同級距
            const isFirstBid = finalStepCount === null;
            const targetIndex = Math.min((isFirstBid ? stepCount : finalStepCount) - 1, validBids.length - 1);
            selectedBid = validBids[targetIndex];
            log(`使用劫鏢模式，${isFirstBid ? '第一次' : '最後'} 出價，選擇第 ${isFirstBid ? stepCount : finalStepCount}/${validBids.length} 個級距：${selectedBid}（高於當前價格 ${selectedBid - currentPrice} 元）`, 'bidding');
        }

        if (!selectedBid) {
            throw new Error('無法找到合適的出價金額');
        }

        // 執行出價
        hasAutoBid = strategy !== BidStrategy.SNIPE_BID; // 劫鏢模式第一次出價後還可以再出價
        await placeBid(selectedBid);

        // 如果不是劫鏢模式的第一次出價，則重新載入頁面
        if (strategy !== BidStrategy.SNIPE_BID || finalStepCount !== null) {
            log('準備重新載入頁面', 'info');
            setTimeout(() => {
                location.reload();
            }, 2000);
        }

    } catch (error) {
        log(`執行出價時出錯: ${error.message}`, 'error');
        hasAutoBid = false;
        
        // 如果是重要錯誤，重新載入頁面
        if (error.message.includes('不可用') || error.message.includes('失敗')) {
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }
}

// 開始監控
function startMonitoring(bidConfig) {
    config = bidConfig;
    log('開始監控，配置：' + JSON.stringify(config), 'info');
    
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }

    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }

    // 設置價格更新計時器
    priceUpdateInterval = setInterval(async () => {
        try {
            const currentPrice = getCurrentPrice();
            const prices = getAvailableBids();
            if (currentPrice !== null && prices.length > 0) {
                try {
                    await chrome.runtime.sendMessage({
                        action: 'updatePriceInfo',
                        data: {
                            currentPrice: currentPrice,
                            availableBids: prices
                        }
                    }).catch(() => {
                        // 如果接收端不存在，靜默處理錯誤
                        // 這是正常的情況，因為 popup 可能已關閉
                    });
                } catch (error) {
                    // 只有在真正需要處理的錯誤時才記錄
                    if (!error.message.includes('Receiving end does not exist')) {
                        log('發送價格更新消息時出錯：' + error.message, 'error');
                    }
                }
            }
        } catch (error) {
            log('更新價格資訊時出錯：' + error.message, 'error');
        }
    }, 1000); // 每秒更新一次

    monitoringInterval = setInterval(() => {
        try {
            const remainingSeconds = parseTimeEnd();
            
            if (remainingSeconds === null) {
                return;
            }

            // 檢查是否達到出價條件
            if (config.bidStrategy === BidStrategy.SNIPE_BID) {
                // 劫鏢模式
                if (remainingSeconds <= 6 && remainingSeconds > 5 && !hasAutoBid) {
                    // 第一次出價
                    log(`劫鏢模式第一次出價（剩餘${remainingSeconds}秒）`, 'bidding');
                    executeBid(BidStrategy.SNIPE_BID, config.firstStepCount);
                } else if (remainingSeconds <= 1.5 && hasAutoBid) {
                    // 最後一次出價
                    log(`劫鏢模式最後出價（剩餘${remainingSeconds}秒）`, 'bidding');
                    executeBid(BidStrategy.SNIPE_BID, null, config.finalStepCount);
                }
            } else if (config.bidStrategy === BidStrategy.STEP_BID && remainingSeconds <= config.secondsBeforeBid) {
                // 級距出價
                log(`執行級距出價（剩餘${remainingSeconds}秒）`, 'bidding');
                executeBid(BidStrategy.STEP_BID, config.stepCount);
            }

            // 記錄時間到時間日誌窗格
            updateTimeLog(remainingSeconds);
        } catch (error) {
            log('監控過程中出錯：' + error.message, 'error');
        }
    }, 200);
}

// 停止監控
function stopMonitoring() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
        monitoringInterval = null;
    }
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
        priceUpdateInterval = null;
    }
    log('停止監控', 'info');
}

// 改進的時間同步函數
async function enhancedSyncServerTime() {
    if (!config.enableTimeSync) return;

    try {
        const samples = [];
        const SAMPLE_COUNT = 5;
        const MAX_LATENCY = 1000; // 最大允許延遲 1 秒

        // 收集多個時間樣本
        for (let i = 0; i < SAMPLE_COUNT; i++) {
            const sample = await getSingleTimeSample();
            if (sample.latency < MAX_LATENCY) {
                samples.push(sample);
            }
            await new Promise(resolve => setTimeout(resolve, 200)); // 間隔 200ms
        }

        if (samples.length === 0) {
            throw new Error('無法獲取有效的時間樣本');
        }

        // 按延遲時間排序並選擇最佳樣本
        samples.sort((a, b) => a.latency - b.latency);
        const bestSample = samples[0];

        // 更新時間偏移
        serverTimeOffset = bestSample.offset;
        serverTimeSynced = true;
        TIME_SYNC.lastSyncTime = Date.now();

        log(`時間同步成功 (延遲: ${bestSample.latency}ms, 偏移: ${serverTimeOffset}ms)`, 'timing');
    } catch (error) {
        log(`時間同步失敗: ${error.message}`, 'error');
        if (!serverTimeSynced) {
            serverTimeOffset = 0;
        }
    }
}

// 獲取單個時間樣本
async function getSingleTimeSample() {
    const startTime = performance.now();
    
    // 獲取伺服器時間參考點
    const timeElement = document.getElementById('time_end');
    if (!timeElement) {
        throw new Error('找不到時間元素');
    }

    const numbers = timeElement.getElementsByTagName('font');
    if (numbers.length !== 4) {
        throw new Error('時間格式不正確');
    }

    const days = parseInt(numbers[0].textContent, 10);
    const hours = parseInt(numbers[1].textContent, 10);
    const minutes = parseInt(numbers[2].textContent, 10);
    const seconds = parseInt(numbers[3].textContent, 10);

    if ([days, hours, minutes, seconds].some(isNaN)) {
        throw new Error('時間解析失敗');
    }

    const endTime = performance.now();
    const latency = endTime - startTime;

    // 計算總秒數
    const totalSeconds = (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
    
    // 從截標時間倒推當前時間
    const stopDateElement = document.getElementById('newBidEndDateHome');
    if (!stopDateElement) {
        throw new Error('找不到截標日期');
    }

    const endDate = parseDisplayEndDate(stopDateElement.textContent);
    if (!endDate) {
        throw new Error('無法解析截標日期');
    }

    const estimatedNow = new Date(endDate.getTime() - (totalSeconds * 1000));
    const offset = estimatedNow.getTime() - Date.now();

    return {
        latency,
        offset,
        timestamp: Date.now()
    };
}

// 獲取價格級距
function getPriceRanges() {
    const currentPrice = getCurrentPrice();
    if (!currentPrice) {
        console.log('無法獲取當前價格');
        return [];
    }

    try {
        // 首先嘗試從實際的下拉選單獲取價格選項
        const select = document.querySelector('#bidprice');
        if (select) {
            const prices = Array.from(select.options)
                .map(option => parseInt(option.value, 10))
                .filter(price => !isNaN(price) && price > currentPrice)
                .sort((a, b) => a - b);

            if (prices.length > 0) {
                console.log('從下拉選單獲取價格級距：', prices);
                return prices;
            }
        }
    } catch (error) {
        console.log('從下拉選單獲取價格級距時出錯：', error);
    }

    // 如果無法從下拉選單獲取，則生成預設價格級距
    const priceRanges = [];
    const priceStep = calculatePriceStep(currentPrice);
    
    // 生成5個價格級距選項
    for (let i = 1; i <= 5; i++) {
        const price = currentPrice + (priceStep * i);
        priceRanges.push(price);
    }

    console.log('生成預設價格級距：', priceRanges);
    return priceRanges;
}

// 監聽來自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('收到消息：' + JSON.stringify(message), 'debug');
    
    switch (message.action) {
        case 'ping':
            log('回應 ping 請求', 'debug');
            sendResponse({ success: true });
            break;

        case 'getStatus':
            log('取得監控狀態', 'debug');
            sendResponse({
                success: true,
                isMonitoring: monitoringInterval !== null,
                hasAutoBid: hasAutoBid,
                config: config
            });
            break;

        case 'checkBidButton':
            // 改用確定出價按鈕來判斷
            const bidButton = document.querySelector('#bidButton.btn.bg_blue2[title="確定出價"]');
            if (!bidButton) {
                log('找不到確定出價按鈕', 'debug');
                sendResponse({ error: 'notLoggedIn' });
                return true;
            }
            
            // 檢查是否已結標
            const timeEnd = document.querySelector('#time_end');
            if (timeEnd && timeEnd.textContent.includes('00天00時00分00秒')) {
                log('商品已結標', 'debug');
                sendResponse({ isEnded: true });
                return true;
            }

            log('確定出價按鈕狀態正常', 'debug');
            sendResponse({ success: true });
            return true;

        case 'checkAuctionStatus':
            const timeEndStatus = document.querySelector('#time_end');
            const isEnded = timeEndStatus && timeEndStatus.textContent.includes('00天00時00分00秒');
            log('檢查結標狀態：' + (isEnded ? '已結標' : '競標中'), 'debug');
            
            let finalPrice = null;
            if (isEnded) {
                const priceElement = document.querySelector('#txt_money');
                if (priceElement) {
                    finalPrice = priceElement.value || priceElement.textContent;
                }
            }
            
            sendResponse({ 
                isEnded: isEnded,
                finalPrice: finalPrice
            });
            break;

        case 'startMonitoring':
            log('開始監控請求，設定：' + JSON.stringify(message.config), 'debug');
            try {
                updateLogConfig(message.config);
                startMonitoring(message.config);
                log('監控已啟動', 'info');
                sendResponse({ success: true });
            } catch (error) {
                log('啟動監控失敗：' + error.message, 'error');
                sendResponse({ error: error.message });
            }
            break;

        case 'stopMonitoring':
            log('停止監控請求', 'debug');
            stopMonitoring();
            sendResponse({ success: true });
            break;

        case 'updateLogConfig':
            log('更新日誌設定', 'debug');
            updateLogConfig(message);
            sendResponse({ success: true });
            break;

        case 'getPriceRanges':
            try {
                const prices = getAvailableBids();
                const remainingTime = getRemainingSeconds();
                log('取得價格範圍：' + JSON.stringify(prices), 'debug');
                log('剩餘時間：' + remainingTime + '秒', 'debug');
                
                sendResponse({
                    success: true,
                    prices: prices,
                    remainingSeconds: remainingTime
                });
            } catch (error) {
                log('取得價格範圍失敗：' + error.message, 'error');
                sendResponse({ error: error.message });
            }
            break;

        default:
            log('未知的消息類型：' + message.action, 'warning');
            sendResponse({ error: '未知的請求類型' });
    }
    return true;
});

// 初始化
createLogContainer();

// 確保在頁面載入完成後也創建日誌容器
document.addEventListener('DOMContentLoaded', () => {
    createLogContainer();
    createTimeLogContainer();
    createTimeParseLogContainer();
    log('頁面載入完成', 'info');
});

// 在頁面卸載前記錄
window.addEventListener('beforeunload', () => {
    log('頁面即將重新載入...', 'info');
});

// 創建時間解析日誌窗格
function createTimeParseLogContainer() {
    let container = document.getElementById('time-parse-log');
    if (container) {
        return container;
    }

    container = document.createElement('div');
    container.id = 'time-parse-log';
    container.style.cssText = `
        position: fixed;
        right: 10px;
        bottom: 60px;
        width: 300px;
        height: 30px;
        background-color: rgba(0, 0, 0, 0.9);
        color: #87cefa;
        font-size: 12px;
        padding: 5px 10px;
        border-radius: 5px;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    `;

    document.body.appendChild(container);
    return container;
}

function updateTimeParseLog(days, hours, minutes, seconds, totalSeconds) {
    const container = document.getElementById('time-parse-log') || createTimeParseLogContainer();
    container.textContent = `解析時間：${days}天${hours}時${minutes}分${seconds}秒 => ${totalSeconds}秒`;
}

function parseTimeEnd() {
    const timeEndElement = document.getElementById('time_end');
    if (!timeEndElement) {
        log('找不到時間元素 (time_end)', 'error');
        return null;
    }

    // 獲取所有數字元素
    const numbers = Array.from(timeEndElement.getElementsByTagName('font')).map(font => font.textContent);
    if (numbers.length !== 4) {
        log('時間格式不符合預期 (應該有4個數字)', 'error');
        return null;
    }

    // 解析時間
    const [days, hours, minutes, seconds] = numbers.map(n => parseInt(n, 10));
    
    // 轉換為總秒數
    const totalSeconds = (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
    
    if (isNaN(totalSeconds)) {
        log('時間轉換失敗', 'error');
        return null;
    }

    // 更新時間解析日誌窗格，而不是寫入主日誌
    updateTimeParseLog(days, hours, minutes, seconds, totalSeconds);
    return totalSeconds;
}

// 獲取剩餘秒數
function getRemainingSeconds() {
    try {
        const timeEndElement = document.getElementById('time_end');
        if (!timeEndElement) {
            log('找不到時間元素 (time_end)', 'error');
            return null;
        }

        // 獲取所有數字元素
        const numbers = Array.from(timeEndElement.getElementsByTagName('font')).map(font => font.textContent);
        if (numbers.length !== 4) {
            log('時間格式不符合預期 (應該有4個數字)', 'error');
            return null;
        }

        // 解析時間
        const [days, hours, minutes, seconds] = numbers.map(n => parseInt(n, 10));
        
        // 轉換為總秒數
        const totalSeconds = (days * 24 * 3600) + (hours * 3600) + (minutes * 60) + seconds;
        
        if (isNaN(totalSeconds)) {
            log('時間轉換失敗', 'error');
            return null;
        }

        return totalSeconds;
    } catch (error) {
        log('獲取剩餘時間時出錯：' + error.message, 'error');
        return null;
    }
}

// 更新日誌配置
function updateLogConfig(config) {
    try {
        // 更新日誌容器的顯示狀態
        const logContainer = document.getElementById('bidding-assistant-log');
        if (logContainer) {
            logContainer.style.display = config.showFloatingWindow ? 'block' : 'none';
        }
    } catch (error) {
        log('更新日誌配置時出錯：' + error.message, 'error');
    }
}

// 創建時間日誌窗格
function createTimeLogContainer() {
    let container = document.getElementById('time-log-container');
    if (container) {
        return container;
    }

    container = document.createElement('div');
    container.id = 'time-log-container';
    container.style.cssText = `
        position: fixed;
        right: 10px;
        bottom: 10px;
        width: 200px;
        height: 40px;
        background-color: rgba(0, 0, 0, 0.9);
        color: #fff;
        font-size: 16px;
        padding: 10px;
        border-radius: 5px;
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: monospace;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    `;

    document.body.appendChild(container);
    return container;
}

// 更新時間日誌
function updateTimeLog(remainingSeconds) {
    const container = document.getElementById('time-log-container') || createTimeLogContainer();
    
    // 格式化時間
    const days = Math.floor(remainingSeconds / 86400);
    const hours = Math.floor((remainingSeconds % 86400) / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);
    const seconds = remainingSeconds % 60;
    
    // 如果剩餘時間小於等於10秒，使用紅色
    if (remainingSeconds <= 10) {
        container.style.color = '#ff6b6b';
    } else {
        container.style.color = '#fff';
    }
    
    // 更新顯示
    container.textContent = `${days}天${hours}時${minutes}分${seconds}秒`;
}