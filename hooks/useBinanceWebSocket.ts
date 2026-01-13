"use client";

import { useEffect, useRef, useState } from "react";

// Check if symbol exists on Binance Spot
async function checkBinanceSpot(symbol: string): Promise<boolean> {
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        return response.ok;
    } catch {
        return false;
    }
}

// Check if symbol exists on Binance Futures
async function checkBinanceFutures(symbol: string): Promise<boolean> {
    try {
        const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${symbol}`);
        return response.ok;
    } catch {
        return false;
    }
}

// Find the best trading pair for a coin
async function findBinanceSymbol(coinSymbol: string): Promise<{ symbol: string; type: 'spot' | 'futures' } | null> {
    if (!coinSymbol) return null;

    const baseSymbol = coinSymbol.toUpperCase();
    const variations = [
        `${baseSymbol}USDT`,
        `${baseSymbol}BUSD`,
        `${baseSymbol}BTC`,
        `${baseSymbol}ETH`,
    ];

    // Try Futures first (better for real-time data)
    for (const symbol of variations) {
        if (await checkBinanceFutures(symbol)) {
            console.log(`✅ Found on Binance Futures: ${symbol}`);
            return { symbol: symbol.toLowerCase(), type: 'futures' };
        }
    }

    // Fallback to Spot
    for (const symbol of variations) {
        if (await checkBinanceSpot(symbol)) {
            console.log(`✅ Found on Binance Spot: ${symbol}`);
            return { symbol: symbol.toLowerCase(), type: 'spot' };
        }
    }

    console.warn(`⚠️ No Binance pair found for ${coinSymbol}`);
    return null;
}

export const useBinanceWebSocket = ({
                                        coinId,
                                        coinSymbol,
                                        liveInterval = "1s",
                                    }: {
    coinId: string;
    coinSymbol?: string;
    liveInterval?: "1s" | "1m";
}): UseCoinGeckoWebSocketReturn => {
    const wsRef = useRef<WebSocket | null>(null);
    const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const [price, setPrice] = useState<ExtendedPriceData | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [ohlcv, setOhlcv] = useState<OHLCData | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [marketInfo, setMarketInfo] = useState<{ symbol: string; type: 'spot' | 'futures' } | null>(null);

    // Find trading pair
    useEffect(() => {
        let isMounted = true;

        const fetchSymbol = async () => {
            if (!coinSymbol) return;
            const info = await findBinanceSymbol(coinSymbol);
            if (isMounted) {
                setMarketInfo(info);
            }
        };

        fetchSymbol();

        return () => {
            isMounted = false;
        };
    }, [coinId, coinSymbol]);

    // Connect to WebSocket
    useEffect(() => {
        if (!marketInfo) {
            setIsConnected(false);
            return;
        }

        const { symbol, type } = marketInfo;
        console.log(`🔌 Connecting to Binance ${type.toUpperCase()} WebSocket for ${symbol}`);

        const klineInterval = liveInterval === "1s" ? "1s" : "1m";
        let wsUrl: string;
        let streams: string[];

        if (type === 'futures') {
            // Binance Futures streams
            streams = [
                `${symbol}@aggTrade`,
                `${symbol}@kline_${klineInterval}`,
                `${symbol}@markPrice@1s`
            ];
            wsUrl = `wss://fstream.binance.com/stream?streams=${streams.join('/')}`;
        } else {
            // Binance Spot streams
            streams = [
                `${symbol}@trade`,
                `${symbol}@kline_${klineInterval}`,
                `${symbol}@ticker`
            ];
            wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams.join('/')}`;
        }

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onmessage = (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                const data = message.data || message;
                const stream = message.stream || '';

                // Handle trade/aggTrade messages
                if (stream.includes('trade') || stream.includes('aggTrade')) {
                    const tradePrice = parseFloat(data.p);
                    const tradeQuantity = parseFloat(data.q);
                    const tradeValue = tradePrice * tradeQuantity;

                    setPrice((prev) => ({
                        usd: tradePrice,
                        coin: coinId,
                        price: tradePrice,
                        change24h: prev?.change24h,
                        volume24h: prev?.volume24h,
                        timestamp: data.T || data.E,
                    }));

                    const newTrade: Trade = {
                        price: tradePrice,
                        amount: tradeQuantity,
                        value: tradeValue,
                        type: data.m ? "s" : "b",
                        timestamp: data.T || data.E,
                    };

                    setTrades((prev) => [newTrade, ...prev].slice(0, 20));
                }

                // Handle kline messages
                if (stream.includes('kline')) {
                    const k = data.k;
                    const candle: OHLCData = [
                        Math.floor(k.t / 1000),
                        parseFloat(k.o),
                        parseFloat(k.h),
                        parseFloat(k.l),
                        parseFloat(k.c),
                    ];
                    setOhlcv(candle);
                }

                // Handle ticker/markPrice messages
                if (stream.includes('ticker') || stream.includes('markPrice')) {
                    const currentPrice = parseFloat(data.c || data.p);
                    const priceChange = parseFloat(data.P || data.r || '0');

                    setPrice((prev) => ({
                        usd: currentPrice,
                        coin: coinId,
                        price: currentPrice,
                        change24h: priceChange,
                        volume24h: parseFloat(data.v || prev?.volume24h || '0'),
                        timestamp: data.E,
                    }));
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        ws.onopen = () => {
            console.log(`✅ Binance ${type.toUpperCase()} WebSocket connected`);
            setIsConnected(true);

            // Send pong frames every 3 minutes to keep connection alive
            pingIntervalRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    // WebSocket pong is automatically handled by the browser
                    // We just need to keep the connection active
                    ws.send(JSON.stringify({ method: "ping" }));
                }
            }, 180000);
        };

        ws.onerror = (error) => {
            console.error("❌ Binance WebSocket error:", error);
            setIsConnected(false);
        };

        ws.onclose = () => {
            console.log("🔌 Binance WebSocket closed");
            setIsConnected(false);
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
        };

        return () => {
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
                pingIntervalRef.current = null;
            }
            ws.close();
        };
    }, [marketInfo, coinId, liveInterval]);

    return {
        price,
        trades,
        ohlcv,
        isConnected: isConnected && marketInfo !== null,
    };
};