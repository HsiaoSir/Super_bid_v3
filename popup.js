let monitoring = false;
let selectedPrices = new Set();
let updateInterval;

document.addEventListener('DOMContentLoaded', () => {
    const bidStrategy = document.getElementById('bidStrategy');
    const stepBidSection = document.getElementById('stepBidSection');
    const snipeBidSection = document.getElementById('snipeBidSection');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const monitoringStatus = document.getElementById('monitoringStatus');
    const currentPrice = document.getElementById('currentPrice');
    const availableBids = document.getElementById('availableBids');
    const hideTimestamp = document.getElementById('hideTimestamp');
    const parseServerTime = document.getElementById('parseServerTime');
    const showTimeParseLog = document.getElementById('showTimeParseLog');
    const showFloatingWindow = document.getElementById('showFloatingWindow');
    const autoSaveLog = document.getElementById('autoSaveLog');
    const logFileName = document.getElementById('logFileName');
    const showPriceLog = document.getElementById('showPriceLog');
    const showBidLog = document.getElementById('showBidLog');
    const showTimeLog = document.getElementById('showTimeLog');
    const showSystemLog = document.getElementById('showSystemLog');
    const openLogSettings = document.getElementById('openLogSettings');
    const closeLogSettings = document.getElementById('closeLogSettings');
    const logPanel = document.getElementById('logPanel');

    // 更新頻率控制
    function updateRefreshRate(remainingSeconds) {
        if (updateInterval) {
            clearInterval(updateInterval);
        }

        let refreshRate;
        if (remainingSeconds <= 60) { // 剩餘1分鐘內
            refreshRate = 100; // 瘋狂更新（每0.1秒）
        } else if (remainingSeconds <= 300) { // 剩餘5分鐘內
            refreshRate = 5000; // 每5秒
        } else {
            refreshRate = 30000; // 每30秒
        }

        updateInterval = setInterval(updatePriceInfo, refreshRate);
    }

    // 切換策略區域顯示
    bidStrategy.addEventListener('change', () => {
        if (bidStrategy.value === 'stepBid') {
            stepBidSection.classList.add('active');
            snipeBidSection.classList.remove('active');
        } else {
            stepBidSection.classList.remove('active');
            snipeBidSection.classList.add('active');
        }
    });

    // 打開日誌設定面板
    openLogSettings.addEventListener('click', () => {
        logPanel.style.display = 'block';
    });

    // 關閉日誌設定面板
    closeLogSettings.addEventListener('click', () => {
        logPanel.style.display = 'none';
    });

    // 點擊面板外部關閉
    window.addEventListener('click', (event) => {
        if (event.target === logPanel) {
            logPanel.style.display = 'none';
        }
    });

    // 更新日誌設定
    function updateLogSettings() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateLogConfig',
                hideTimestamp: hideTimestamp.checked,
                parseServerTime: parseServerTime.checked,
                showTimeParseLog: showTimeParseLog.checked,
                showFloatingWindow: showFloatingWindow.checked,
                logFilters: {
                    price: showPriceLog.checked,
                    bid: showBidLog.checked,
                    time: showTimeLog.checked,
                    system: showSystemLog.checked
                }
            });
        });

        // 保存設定到 storage
        chrome.storage.local.set({
            hideTimestamp: hideTimestamp.checked,
            parseServerTime: parseServerTime.checked,
            showTimeParseLog: showTimeParseLog.checked,
            showFloatingWindow: showFloatingWindow.checked,
            logFilters: {
                price: showPriceLog.checked,
                bid: showBidLog.checked,
                time: showTimeLog.checked,
                system: showSystemLog.checked
            }
        });
    }

    // 檢查商品狀態
    async function checkAuctionStatus() {
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                chrome.tabs.sendMessage(tabs[0].id, {action: 'checkAuctionStatus'}, (response) => {
                    if (response && response.isEnded) {
                        // 更新所有相關UI元素
                        startBtn.disabled = true;
                        stopBtn.style.display = 'none';
                        startBtn.style.display = 'block';
                        monitoringStatus.textContent = '已結標';
                        monitoringStatus.classList.remove('active', 'inactive');
                        monitoringStatus.classList.add('warning');
                        
                        // 顯示最終價格和競標結束訊息
                        if (response.finalPrice) {
                            currentPrice.textContent = `最終價格：${response.finalPrice}元`;
                        } else {
                            currentPrice.textContent = '最終價格：已結標';
                        }
                        availableBids.textContent = '競標已結束';
                        
                        // 如果正在監控中，停止監控
                        if (monitoring) {
                            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopMonitoring'});
                            monitoring = false;
                            if (updateInterval) {
                                clearInterval(updateInterval);
                                updateInterval = null;
                            }
                        }
                        resolve(true);
                    } else if (response && response.error) {
                        monitoringStatus.textContent = response.error;
                        monitoringStatus.classList.remove('active', 'inactive');
                        monitoringStatus.classList.add('warning');
                        resolve(false);
                    } else {
                        resolve(false);
                    }
                });
            });
        });
    }

    // 檢查登入狀態和出價按鈕
    function checkLoginAndBidButton() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'checkBidButton'}, (response) => {
                if (response && response.isEnded) {
                    startBtn.disabled = true;
                    monitoringStatus.textContent = '已結標';
                    monitoringStatus.classList.remove('active', 'inactive');
                    monitoringStatus.classList.add('warning');
                    if (updateInterval) {
                        clearInterval(updateInterval);
                        updateInterval = null;
                    }
                } else if (response && response.error === 'notLoggedIn') {
                    startBtn.disabled = true;
                    monitoringStatus.textContent = '請先登入惜物網會員帳號';
                    monitoringStatus.classList.remove('active', 'warning');
                    monitoringStatus.classList.add('inactive');
                } else if (response && response.success) {
                    startBtn.disabled = false;
                    if (!monitoring) {
                        monitoringStatus.textContent = '未開始監控';
                        monitoringStatus.classList.remove('active', 'warning');
                        monitoringStatus.classList.add('inactive');
                    }
                } else {
                    startBtn.disabled = true;
                    monitoringStatus.textContent = '無法取得出價按鈕，請先登入會員';
                    monitoringStatus.classList.remove('active');
                    monitoringStatus.classList.add('warning');
                }
            });
        });
    }

    // 更新價格資訊
    async function updatePriceInfo() {
        // 先檢查商品是否已結標
        const isEnded = await checkAuctionStatus();
        if (isEnded) {
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'getPriceRanges',
                hideTimestamp: hideTimestamp.checked,
                parseServerTime: parseServerTime.checked,
                showTimeParseLog: showTimeParseLog.checked,
                showFloatingWindow: showFloatingWindow.checked,
                logFilters: {
                    price: showPriceLog.checked,
                    bid: showBidLog.checked,
                    time: showTimeLog.checked,
                    system: showSystemLog.checked
                }
            }, (response) => {
                if (response && response.prices) {
                    const prices = response.prices;
                    if (prices.length > 0) {
                        const currentBidPrice = prices[0] - calculatePriceStep(prices[0]);
                        currentPrice.textContent = `當前價格：${currentBidPrice}元`;
                        availableBids.textContent = `可用出價：${prices.join('元, ')}元`;
                    } else {
                        currentPrice.textContent = '當前價格：無法取得';
                        availableBids.textContent = '可用出價：無法取得';
                    }
                    
                    if (response.remainingSeconds !== undefined) {
                        if (response.remainingSeconds <= 0) {
                            checkAuctionStatus();
                            if (updateInterval) {
                                clearInterval(updateInterval);
                                updateInterval = null;
                            }
                        } else {
                            updateRefreshRate(response.remainingSeconds);
                        }
                    }
                } else {
                    currentPrice.textContent = '當前價格：無法取得';
                    availableBids.textContent = '可用出價：無法取得';
                }
            });
        });
    }

    // 計算價格級距
    function calculatePriceStep(price) {
        if (price < 1000) return 50;
        if (price < 5000) return 100;
        if (price < 10000) return 200;
        if (price < 50000) return 500;
        return 1000;
    }

    // 檢查監控狀態
    function checkStatus() {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, (response) => {
                if (response && response.monitoring) {
                    startBtn.style.display = 'none';
                    stopBtn.style.display = 'block';
                    monitoringStatus.textContent = '監控中';
                    monitoringStatus.classList.remove('inactive');
                    monitoringStatus.classList.add('active');
                    monitoring = true;
                    updatePriceInfo(); // 立即更新一次
                } else {
                    startBtn.style.display = 'block';
                    stopBtn.style.display = 'none';
                    monitoringStatus.textContent = '未開始監控';
                    monitoringStatus.classList.remove('active');
                    monitoringStatus.classList.add('inactive');
                    monitoring = false;
                    if (updateInterval) {
                        clearInterval(updateInterval);
                    }
                }
            });
        });
    }

    // 初始化價格顯示
    function initializePriceDisplay() {
        currentPrice.textContent = '當前價格：載入中...';
        availableBids.textContent = '可用出價：載入中...';
    }

    // 檢查 content script 是否已準備就緒
    async function checkContentScriptReady() {
        console.log('開始檢查 content script 狀態');
        return new Promise((resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (!tabs[0]) {
                    console.log('無法找到當前頁面');
                    resolve(false);
                    return;
                }
                console.log('找到當前頁面:', tabs[0].url);
                try {
                    chrome.tabs.sendMessage(tabs[0].id, {action: 'ping'}, response => {
                        if (chrome.runtime.lastError) {
                            console.log('連線檢查錯誤:', chrome.runtime.lastError.message);
                            resolve(false);
                            return;
                        }
                        console.log('content script 回應:', response);
                        resolve(!!response);
                    });
                } catch (error) {
                    console.log('連線檢查發生異常:', error);
                    resolve(false);
                }
            });
        });
    }

    // 開始監控
    startBtn.addEventListener('click', async () => {
        console.log('點擊開始監控按鈕');
        if (startBtn.disabled) {
            console.log('按鈕已被禁用，無法啟動監控');
            alert('無法啟動監控：請先登入會員');
            return;
        }

        try {
            // 檢查 content script 是否已準備就緒
            console.log('檢查 content script 狀態');
            const isReady = await checkContentScriptReady();
            console.log('content script 檢查結果:', isReady);
            
            if (!isReady) {
                console.log('無法連接到 content script');
                monitoringStatus.textContent = '請重新整理頁面後再試';
                monitoringStatus.classList.remove('active');
                monitoringStatus.classList.add('warning');
                alert('無法連接到競標頁面，請重新整理頁面後再試');
                return;
            }

            // 先檢查商品是否已結標
            const isEnded = await checkAuctionStatus();
            if (isEnded) {
                throw new Error('商品已結標，無法啟動監控');
            }

            // 立即更新UI狀態
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            monitoringStatus.textContent = '正在啟動監控...';
            monitoringStatus.classList.remove('inactive');
            monitoringStatus.classList.add('active');

            const config = {
                bidStrategy: bidStrategy.value,
                enableTimeSync: true,
                hideTimestamp: hideTimestamp.checked,
                parseServerTime: parseServerTime.checked,
                showTimeParseLog: showTimeParseLog.checked,
                showFloatingWindow: showFloatingWindow.checked,
                logFilters: {
                    price: showPriceLog.checked,
                    bid: showBidLog.checked,
                    time: showTimeLog.checked,
                    system: showSystemLog.checked
                }
            };
            if (bidStrategy.value === 'stepBid') {
                config.secondsBeforeBid = parseInt(document.getElementById('secondsBeforeBid').value);
                config.stepCount = parseInt(document.getElementById('stepCount').value);
            } else {
                config.firstStepCount = parseInt(document.getElementById('firstStepCount').value);
                config.finalStepCount = parseInt(document.getElementById('finalStepCount').value);
            }

            // 使用 Promise 包裝 chrome.tabs.sendMessage
            const response = await new Promise((resolve, reject) => {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (!tabs[0]) {
                        reject(new Error('無法找到當前頁面'));
                        return;
                    }
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'startMonitoring',
                        config: config
                    }, response => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        resolve(response);
                    });
                });
            });

            if (response && response.success) {
                monitoring = true;
                monitoringStatus.textContent = '監控中';
                updatePriceInfo(); // 立即更新價格資訊
            } else {
                throw new Error(response ? response.error : '未知錯誤');
            }
        } catch (error) {
            console.log('啟動監控時發生錯誤:', error);
            // 恢復原始狀態
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            monitoringStatus.textContent = '未開始監控';
            monitoringStatus.classList.remove('active');
            monitoringStatus.classList.add('inactive');
            alert('啟動監控失敗：' + error.message);
        }
    });

    // 停止監控
    stopBtn.addEventListener('click', () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {action: 'stopMonitoring'}, (response) => {
                if (response && response.success) {
                    checkStatus();
                }
            });
        });
    });

    // 日誌控制變更事件
    [
        hideTimestamp, 
        parseServerTime, 
        showTimeParseLog, 
        showFloatingWindow,
        showPriceLog,
        showBidLog,
        showTimeLog,
        showSystemLog
    ].forEach(element => {
        element.addEventListener('change', updateLogSettings);
    });

    // 初始化時載入已保存的設定
    chrome.storage.local.get([
        'hideTimestamp',
        'parseServerTime',
        'showTimeParseLog',
        'showFloatingWindow',
        'logFilters'
    ], (result) => {
        hideTimestamp.checked = result.hideTimestamp || false;
        parseServerTime.checked = result.parseServerTime || false;
        showTimeParseLog.checked = result.showTimeParseLog || false;
        showFloatingWindow.checked = result.showFloatingWindow !== undefined ? result.showFloatingWindow : true;
        
        // 載入日誌過濾器設定
        const logFilters = result.logFilters || {
            price: true,
            bid: true,
            time: true,
            system: true
        };
        
        showPriceLog.checked = logFilters.price;
        showBidLog.checked = logFilters.bid;
        showTimeLog.checked = logFilters.time;
        showSystemLog.checked = logFilters.system;
        
        updateLogSettings();
    });

    // 初始化
    async function initialize() {
        console.log('開始初始化插件');
        try {
            // 檢查 content script 是否已準備就緒
            console.log('正在檢查 content script...');
            const isReady = await checkContentScriptReady();
            console.log('content script 檢查結果:', isReady);
            
            if (!isReady) {
                console.log('初始化時無法連接到 content script');
                monitoringStatus.textContent = '請重新整理頁面';
                monitoringStatus.classList.remove('active', 'inactive');
                monitoringStatus.classList.add('warning');
                startBtn.disabled = true;
                return;
            }

            console.log('開始設置初始狀態');
            // 設置初始載入狀態
            initializePriceDisplay();
            
            console.log('檢查商品狀態');
            const isEnded = await checkAuctionStatus();
            console.log('商品是否已結標:', isEnded);
            
            if (!isEnded) {
                console.log('執行初始化檢查');
                checkStatus();
                updatePriceInfo();
                checkLoginAndBidButton();
            }
        } catch (error) {
            console.log('初始化失敗:', error);
            monitoringStatus.textContent = '初始化失敗，請重新整理頁面';
            monitoringStatus.classList.remove('active', 'inactive');
            monitoringStatus.classList.add('warning');
            startBtn.disabled = true;
        }
    }

    // 執行初始化
    initialize();
}); 