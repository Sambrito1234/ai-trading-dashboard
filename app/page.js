"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Title, Tooltip, Legend, Filler,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, Title, Tooltip, Legend, Filler
);

const API = "https://ai-trading-backend-ny5g.onrender.com";

export default function Home() {
  const [pnl, setPnl] = useState({
    holdings: {}, total_invested: 0, total_current_value: 0,
    total_pnl: 0, total_pnl_pct: 0, cash: 0, portfolio_value: 0,
    overall_pnl: 0, overall_pnl_pct: 0, realized_pnl: 0,
    profit_target_pct: 2, stop_loss_pct: 1.5,
  });
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [dailyPnl, setDailyPnl] = useState([]);
  const [dailyTrades, setDailyTrades] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [tradeFilter, setTradeFilter] = useState("ALL");
  const [signalFilter, setSignalFilter] = useState("ALL");

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchPnl = async () => {
    try {
      const res = await axios.get(`${API}/portfolio/pnl`);
      setPnl(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {}
  };

  const fetchSignals = async () => {
    try {
      const res = await axios.get(`${API}/signals`);
      setSignals(res.data);
    } catch (e) {}
  };

  const fetchTrades = async () => {
    try {
      const res = await axios.get(`${API}/trades`);
      setTrades(res.data);
    } catch (e) {}
  };

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API}/watchlist`);
      setWatchlist(res.data);
    } catch (e) {}
  };

  const fetchDailyPnl = async () => {
    try {
      const res = await axios.get(`${API}/daily-pnl`);
      setDailyPnl(res.data.slice().reverse());
    } catch (e) {}
  };

  const fetchDailyTrades = async () => {
    try {
      const res = await axios.get(`${API}/daily-trades`);
      setDailyTrades(res.data);
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
    } catch (e) {}
  };

  const fetchStockData = async (sym) => {
    const target = (sym || symbol).trim().toUpperCase();
    if (!target) return;
    setLoading(true);
    try {
      const [stockRes, histRes] = await Promise.all([
        axios.get(`${API}/stock/${target}`),
        axios.get(`${API}/history/${target}`),
      ]);
      setStockData(stockRes.data);
      if (histRes.data.prices?.length > 0) {
        setChartData({
          labels: histRes.data.dates,
          datasets: [{
            label: `${target} Price`,
            data: histRes.data.prices,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.06)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 5,
          }],
        });
      }
    } catch (e) {
      showNotification("Could not fetch stock data", "error");
    }
    setLoading(false);
  };

  const buyStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/buy/${symbol}?quantity=1`);
      if (res.data.error) showNotification(res.data.error, "error");
      else {
        showNotification(`✅ Bought ${symbol} | Target: ₹${res.data.target_sell_price} | SL: ₹${res.data.stop_loss_price}`);
        fetchPnl(); fetchTrades(); fetchStats();
      }
    } catch (e) { showNotification("Buy failed", "error"); }
  };

  const sellStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/sell/${symbol}?quantity=1`);
      if (res.data.error) showNotification(res.data.error, "error");
      else {
        const pnlStr = res.data.pnl >= 0 ? `+₹${res.data.pnl}` : `-₹${Math.abs(res.data.pnl)}`;
        showNotification(`✅ Sold ${symbol} | P&L: ${pnlStr} (${res.data.pnl_pct}%)`);
        fetchPnl(); fetchTrades(); fetchStats();
      }
    } catch (e) { showNotification("Sell failed", "error"); }
  };

  const triggerScan = async () => {
    showNotification("🔍 Scanning market...", "info");
    try {
      await axios.post(`${API}/scan`);
      await Promise.all([fetchSignals(), fetchPnl(), fetchTrades(), fetchDailyPnl(), fetchStats()]);
      showNotification("✅ Scan complete!");
    } catch (e) { showNotification("Scan failed", "error"); }
  };

  const addToWatchlist = async () => {
    if (!newWatchSymbol) return;
    try {
      await axios.post(`${API}/watchlist/add/${newWatchSymbol}`);
      setNewWatchSymbol("");
      fetchWatchlist();
      showNotification(`Added ${newWatchSymbol}`);
    } catch (e) {}
  };

  const removeFromWatchlist = async (sym) => {
    try {
      await axios.delete(`${API}/watchlist/remove/${sym}`);
      fetchWatchlist();
    } catch (e) {}
  };

  useEffect(() => {
    fetchPnl(); fetchSignals(); fetchTrades();
    fetchWatchlist(); fetchDailyPnl(); fetchDailyTrades(); fetchStats();
    const interval = setInterval(() => {
      fetchPnl(); fetchSignals(); fetchTrades(); fetchDailyPnl(); fetchDailyTrades();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const pnlColor = (v) => v >= 0 ? "text-green-400" : "text-red-400";
  const pnlPrefix = (v) => v >= 0 ? "+" : "";
  const signalBg = (s) => s === "BUY" ? "bg-green-900 border-green-700" : "bg-zinc-800 border-zinc-700";
  const signalColor = (s) => s === "BUY" ? "text-green-400" : "text-yellow-400";
  const sentimentLabel = (s) => s === 1 ? "😊 +ve" : s === -1 ? "😟 -ve" : "😐 Neutral";
  const sentimentColor = (s) => s === 1 ? "text-green-400" : s === -1 ? "text-red-400" : "text-zinc-400";

  const filteredTrades = tradeFilter === "ALL" ? trades
    : tradeFilter === "PROFIT" ? trades.filter(t => t.type === "SELL" && t.pnl > 0)
    : tradeFilter === "LOSS" ? trades.filter(t => t.type === "SELL" && t.pnl <= 0)
    : trades.filter(t => t.mode === tradeFilter);

  const filteredSignals = signalFilter === "ALL" ? signals : signals.filter(s => s.signal === signalFilter);

  const dailyChartData = {
    labels: dailyPnl.map(d => d.date),
    datasets: [{
      label: "Daily P&L %",
      data: dailyPnl.map(d => d.pnl_pct),
      backgroundColor: dailyPnl.map(d => d.pnl_pct >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)"),
      borderColor: dailyPnl.map(d => d.pnl_pct >= 0 ? "#22c55e" : "#ef4444"),
      borderWidth: 1, borderRadius: 4,
    }],
  };

  const dailyChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: { callbacks: { label: (ctx) => ` ${ctx.raw >= 0 ? "+" : ""}${ctx.raw?.toFixed(2)}%` } }
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "#9ca3af", callback: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` }, grid: { color: "#1f2937" } },
    },
  };

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: "#fff" } }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { ticks: { color: "#9ca3af", maxTicksLimit: 8 }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-xl border text-sm font-bold shadow-2xl max-w-sm
          ${notification.type === "error" ? "bg-red-900 border-red-600 text-red-200"
          : notification.type === "info" ? "bg-blue-900 border-blue-600 text-blue-200"
          : "bg-green-900 border-green-600 text-green-200"}`}>
          {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <h1 className="text-xl font-bold text-green-400 tracking-widest uppercase">AI Trading Bot</h1>
          <div className="hidden md:flex gap-2 text-xs">
            <span className="bg-green-900 border border-green-700 text-green-300 px-2 py-1 rounded">Target: +{pnl.profit_target_pct}%</span>
            <span className="bg-red-900 border border-red-700 text-red-300 px-2 py-1 rounded">SL: -{pnl.stop_loss_pct}%</span>
            <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-1 rounded">AUTO ON</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="hidden md:block">Updated: {lastUpdated}</span>
          <button onClick={triggerScan} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
            ⚡ Scan Now
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-zinc-800 px-8 flex gap-1 pt-2 bg-zinc-950 overflow-x-auto">
        {["dashboard", "daily p&l", "signals", "trades", "watchlist", "stats"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wide rounded-t-lg transition whitespace-nowrap
              ${activeTab === tab ? "bg-zinc-900 text-green-400 border-t border-l border-r border-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-6">

        {/* ==================== DASHBOARD ==================== */}
        {activeTab === "dashboard" && (
          <div>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Cash Available</p>
                <p className="text-xl font-bold text-green-400">₹{pnl.cash?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Portfolio Value</p>
                <p className="text-xl font-bold text-blue-400">₹{pnl.portfolio_value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Unrealized P&L</p>
                <p className={`text-xl font-bold ${pnlColor(pnl.total_pnl)}`}>
                  {pnlPrefix(pnl.total_pnl)}₹{Math.abs(pnl.total_pnl || 0).toFixed(2)}
                </p>
                <p className={`text-xs ${pnlColor(pnl.total_pnl_pct)}`}>{pnlPrefix(pnl.total_pnl_pct)}{pnl.total_pnl_pct?.toFixed(2)}%</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Realized P&L</p>
                <p className={`text-xl font-bold ${pnlColor(pnl.realized_pnl)}`}>
                  {pnlPrefix(pnl.realized_pnl)}₹{Math.abs(pnl.realized_pnl || 0).toFixed(2)}
                </p>
                <p className="text-xs text-zinc-500">From completed trades</p>
              </div>
            </div>

            {/* MANUAL TRADE */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
              <p className="text-zinc-400 text-xs mb-3 font-bold uppercase tracking-widest">Manual Trade</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="RELIANCE.NS / AAPL / TCS.NS"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && fetchStockData()}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-72 text-white outline-none focus:border-green-500 text-sm"
                />
                <button onClick={() => fetchStockData()} className="bg-blue-700 hover:bg-blue-600 px-5 py-3 rounded-lg text-sm font-bold transition">
                  {loading ? "⏳" : "Search"}
                </button>
                <button onClick={buyStock} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">Buy 1</button>
                <button onClick={sellStock} className="bg-red-700 hover:bg-red-600 px-5 py-3 rounded-lg text-sm font-bold transition">Sell 1</button>
              </div>
            </div>

            {/* STOCK ANALYSIS */}
            {stockData && !stockData.error && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold">{stockData.symbol}
                      {stockData.is_large_cap && <span className="ml-2 text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Large Cap</span>}
                    </h2>
                    <p className="text-zinc-500 text-xs">{stockData.scanned_at}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border font-bold text-sm ${signalBg(stockData.signal)}`}>
                    <span className={signalColor(stockData.signal)}>{stockData.signal}</span>
                    <span className="text-zinc-400 ml-2">· {stockData.confidence}% conf</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-3">
                  <div className="bg-zinc-800 p-3 rounded-lg col-span-1">
                    <p className="text-zinc-500 text-xs mb-1">Price</p>
                    <p className="text-lg font-bold text-white">₹{stockData.current_price}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">RSI</p>
                    <p className={`text-lg font-bold ${stockData.RSI < 35 ? "text-green-400" : stockData.RSI > 65 ? "text-red-400" : "text-yellow-400"}`}>{stockData.RSI}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">MACD</p>
                    <p className={`text-lg font-bold ${stockData.MACD_bullish ? "text-green-400" : "text-red-400"}`}>{stockData.MACD_bullish ? "▲ Bull" : "▼ Bear"}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">BB %</p>
                    <p className={`text-lg font-bold ${stockData.BB_position < 20 ? "text-green-400" : stockData.BB_position > 80 ? "text-red-400" : "text-yellow-400"}`}>{stockData.BB_position}%</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Volume</p>
                    <p className={`text-lg font-bold ${stockData.volume_confirms ? "text-green-400" : "text-zinc-400"}`}>{stockData.volume_confirms ? "Strong" : "Weak"}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">News</p>
                    <p className={`text-sm font-bold ${sentimentColor(stockData.sentiment)}`}>{sentimentLabel(stockData.sentiment)}</p>
                  </div>
                </div>
                {/* Buy score bar */}
                <div className="bg-zinc-800 p-3 rounded-lg">
                  <div className="flex justify-between text-xs text-zinc-400 mb-2">
                    <span>Buy score: {stockData.buy_score}/15</span>
                    <span>Min needed: {stockData.is_large_cap ? "70%" : "55%"} confidence</span>
                  </div>
                  <div className="w-full bg-zinc-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${(stockData.buy_score / 15) * 100}%` }}></div>
                  </div>
                </div>
              </div>
            )}

            {/* CHART */}
            {chartData.labels.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
                <h2 className="text-lg font-bold mb-4">90-Day Price Chart</h2>
                <div style={{ height: "250px" }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>
            )}

            {/* HOLDINGS — with profit progress bar */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h2 className="text-lg font-bold mb-4">Holdings — Profit Progress</h2>
              {Object.keys(pnl.holdings).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(pnl.holdings).map(([sym, data]) => (
                    <div key={sym}
                      className="bg-zinc-800 border border-zinc-700 p-4 rounded-xl cursor-pointer hover:border-zinc-500 transition"
                      onClick={() => { setSymbol(sym); fetchStockData(sym); }}>

                      {/* Top row */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-lg">{sym}</p>
                            {data.is_large_cap && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Large Cap</span>}
                          </div>
                          <p className="text-zinc-500 text-xs">{data.quantity} share · bought @ ₹{data.avg_buy_price}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg text-white">₹{data.current_price}</p>
                          <p className={`text-sm font-bold ${pnlColor(data.pnl)}`}>
                            {pnlPrefix(data.pnl)}₹{Math.abs(data.pnl).toFixed(2)} ({pnlPrefix(data.pnl_pct)}{data.pnl_pct.toFixed(2)}%)
                          </p>
                        </div>
                      </div>

                      {/* Profit progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                          <span>Progress to +{pnl.profit_target_pct}% target</span>
                          <span className={pnlColor(data.pnl_pct)}>{data.progress_to_target_pct?.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-700 rounded-full h-2.5 relative">
                          <div
                            className={`h-2.5 rounded-full transition-all ${data.pnl_pct >= 0 ? "bg-green-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, Math.abs(data.progress_to_target_pct || 0))}%` }}>
                          </div>
                        </div>
                      </div>

                      {/* Price levels */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="bg-red-900 bg-opacity-30 border border-red-800 p-2 rounded text-center">
                          <p className="text-red-400 mb-0.5">Stop Loss</p>
                          <p className="text-red-300 font-bold">₹{data.stop_loss_price}</p>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-600 p-2 rounded text-center">
                          <p className="text-zinc-400 mb-0.5">Bought at</p>
                          <p className="text-white font-bold">₹{data.avg_buy_price}</p>
                        </div>
                        <div className="bg-green-900 bg-opacity-30 border border-green-800 p-2 rounded text-center">
                          <p className="text-green-400 mb-0.5">Sell Target</p>
                          <p className="text-green-300 font-bold">₹{data.target_sell_price}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="bg-zinc-800 border border-zinc-600 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <p className="text-zinc-400 text-sm">Total unrealized</p>
                      <p className="text-zinc-400 text-xs">Invested: ₹{pnl.total_invested?.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${pnlColor(pnl.total_pnl)}`}>
                        {pnlPrefix(pnl.total_pnl)}₹{Math.abs(pnl.total_pnl || 0).toFixed(2)}
                      </p>
                      <p className={`text-sm ${pnlColor(pnl.total_pnl_pct)}`}>
                        {pnlPrefix(pnl.total_pnl_pct)}{pnl.total_pnl_pct?.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">
                  <p className="text-lg">No holdings yet</p>
                  <p className="text-sm mt-2">Bot will auto-buy when it finds good signals.</p>
                  <p className="text-sm">It will auto-sell when profit reaches +{pnl.profit_target_pct}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== DAILY P&L ==================== */}
        {activeTab === "daily p&l" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Daily P&L + Trade Breakdown</h2>

            {/* Summary cards */}
            {dailyPnl.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Today P&L</p>
                  <p className={`text-2xl font-bold ${pnlColor(dailyPnl[dailyPnl.length-1]?.pnl_pct)}`}>
                    {pnlPrefix(dailyPnl[dailyPnl.length-1]?.pnl_pct)}{dailyPnl[dailyPnl.length-1]?.pnl_pct?.toFixed(2)}%
                  </p>
                  <p className={`text-sm ${pnlColor(dailyPnl[dailyPnl.length-1]?.pnl)}`}>
                    {pnlPrefix(dailyPnl[dailyPnl.length-1]?.pnl)}₹{Math.abs(dailyPnl[dailyPnl.length-1]?.pnl || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Best day</p>
                  <p className="text-2xl font-bold text-green-400">+{Math.max(...dailyPnl.map(d => d.pnl_pct)).toFixed(2)}%</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Worst day</p>
                  <p className="text-2xl font-bold text-red-400">{Math.min(...dailyPnl.map(d => d.pnl_pct)).toFixed(2)}%</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Green days</p>
                  <p className="text-2xl font-bold text-blue-400">{dailyPnl.filter(d => d.pnl_pct >= 0).length}/{dailyPnl.length}</p>
                </div>
              </div>
            )}

            {/* Bar chart */}
            {dailyPnl.length > 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
                <h3 className="text-md font-bold mb-4">Daily P&L % Chart</h3>
                <div style={{ height: "220px" }}>
                  <Bar data={dailyChartData} options={dailyChartOptions} />
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500 mb-6">
                <p>No daily data yet. Click ⚡ Scan Now to record today's snapshot.</p>
              </div>
            )}

            {/* Daily trade breakdown — expandable rows */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                <h3 className="font-bold text-white">Daily Trade Breakdown</h3>
                <p className="text-xs text-zinc-500">Click any day to see trades</p>
              </div>

              {dailyTrades.length === 0 ? (
                <div className="p-8 text-center text-zinc-500">No trade history yet.</div>
              ) : (
                dailyTrades.map((day, di) => {
                  const isExpanded = expandedDay === day.date;
                  const pnlSnapShot = dailyPnl.find(d => d.date === day.date);
                  return (
                    <div key={di} className="border-b border-zinc-800">
                      {/* Day header row — clickable */}
                      <div
                        className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-800 transition"
                        onClick={() => setExpandedDay(isExpanded ? null : day.date)}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-lg">{isExpanded ? "▼" : "▶"}</span>
                          <div>
                            <p className="font-bold text-white">{day.date}</p>
                            <p className="text-zinc-500 text-xs">{day.total_trades} trades · {day.buys} buys · {day.sells} sells</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          {pnlSnapShot && (
                            <div className="text-right hidden md:block">
                              <p className="text-zinc-500 text-xs">Portfolio</p>
                              <p className="text-blue-400 font-bold">₹{pnlSnapShot.portfolio_value?.toLocaleString("en-IN")}</p>
                            </div>
                          )}
                          {pnlSnapShot && (
                            <div className="text-right hidden md:block">
                              <p className="text-zinc-500 text-xs">Day P&L %</p>
                              <p className={`font-bold ${pnlColor(pnlSnapShot.pnl_pct)}`}>
                                {pnlPrefix(pnlSnapShot.pnl_pct)}{pnlSnapShot.pnl_pct?.toFixed(2)}%
                              </p>
                            </div>
                          )}
                          <div className="text-right">
                            <p className="text-zinc-500 text-xs">Realized P&L</p>
                            <p className={`font-bold ${pnlColor(day.realized_pnl)}`}>
                              {pnlPrefix(day.realized_pnl)}₹{Math.abs(day.realized_pnl).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Expanded trade list */}
                      {isExpanded && (
                        <div className="bg-zinc-950 border-t border-zinc-800">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-zinc-600 uppercase border-b border-zinc-800">
                                <th className="p-3 text-left">Time</th>
                                <th className="p-3 text-left">Type</th>
                                <th className="p-3 text-left">Symbol</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-right">Qty</th>
                                <th className="p-3 text-right">P&L</th>
                                <th className="p-3 text-left">Reason</th>
                                <th className="p-3 text-left">Mode</th>
                              </tr>
                            </thead>
                            <tbody>
                              {day.trades.map((t, ti) => (
                                <tr key={ti} className="border-b border-zinc-900 hover:bg-zinc-800 transition">
                                  <td className="p-3 text-zinc-500">{t.time?.slice(11,19)}</td>
                                  <td className={`p-3 font-bold ${t.type === "BUY" ? "text-green-400" : "text-red-400"}`}>{t.type}</td>
                                  <td className="p-3 font-bold text-white">{t.symbol}</td>
                                  <td className="p-3 text-right">₹{t.price}</td>
                                  <td className="p-3 text-right text-zinc-400">{t.quantity}</td>
                                  <td className={`p-3 text-right font-bold ${t.type === "SELL" ? pnlColor(t.pnl) : "text-zinc-600"}`}>
                                    {t.type === "SELL" ? `${pnlPrefix(t.pnl)}₹${Math.abs(t.pnl).toFixed(2)}` : "-"}
                                  </td>
                                  <td className="p-3 text-zinc-500 max-w-xs truncate">{t.reason}</td>
                                  <td className="p-3">
                                    <span className={`px-2 py-0.5 rounded-full ${t.mode === "AUTO" ? "bg-blue-900 text-blue-300" : "bg-zinc-700 text-zinc-300"}`}>
                                      {t.mode}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            {/* Day total row */}
                            <tfoot>
                              <tr className="border-t border-zinc-700 bg-zinc-900">
                                <td className="p-3 text-zinc-400 font-bold" colSpan={5}>Day Total</td>
                                <td className={`p-3 text-right font-bold ${pnlColor(day.realized_pnl)}`}>
                                  {pnlPrefix(day.realized_pnl)}₹{Math.abs(day.realized_pnl).toFixed(2)}
                                </td>
                                <td colSpan={2} className="p-3 text-zinc-500 text-xs">
                                  {day.buys} buys · {day.sells} sells
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ==================== SIGNALS ==================== */}
        {activeTab === "signals" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Buy Signals ({signals.length})</h2>
              <div className="flex gap-2">
                {["ALL", "BUY", "WATCH"].map(f => (
                  <button key={f} onClick={() => setSignalFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition
                      ${signalFilter === f ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>{f}</button>
                ))}
                <button onClick={triggerScan} className="bg-blue-700 hover:bg-blue-600 px-4 py-1 rounded-lg text-xs font-bold ml-2 transition">⚡ Scan</button>
              </div>
            </div>
            {filteredSignals.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">
                <p>No signals yet. Click ⚡ Scan to analyze {watchlist.length} stocks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSignals.map((s, i) => (
                  <div key={i}
                    className={`border rounded-xl p-4 cursor-pointer hover:brightness-110 transition ${signalBg(s.signal)}`}
                    onClick={() => { setSymbol(s.symbol); fetchStockData(s.symbol); setActiveTab("dashboard"); }}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg">{s.symbol}</p>
                        {s.is_large_cap && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">Large Cap</span>}
                      </div>
                      <span className={`font-bold text-sm px-2 py-0.5 rounded ${signalColor(s.signal)}`}>{s.signal}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">₹{s.current_price}</p>
                    <p className="text-xs text-green-400 mb-3">Target sell: ₹{(s.current_price * 1.02).toFixed(2)}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                      <span className="text-zinc-400">RSI: <span className={s.RSI < 35 ? "text-green-400" : "text-yellow-400"}>{s.RSI}</span></span>
                      <span className="text-zinc-400">MACD: <span className={s.MACD_bullish ? "text-green-400" : "text-red-400"}>{s.MACD_bullish ? "▲" : "▼"}</span></span>
                      <span className="text-zinc-400">BB: <span className="text-white">{s.BB_position}%</span></span>
                      <span className="text-zinc-400">News: <span className={sentimentColor(s.sentiment)}>{sentimentLabel(s.sentiment)}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-400" style={{ width: `${s.confidence}%` }}></div>
                      </div>
                      <span className="text-xs text-zinc-400">{s.confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TRADES ==================== */}
        {activeTab === "trades" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Trade History ({trades.length})</h2>
              <div className="flex gap-2">
                {["ALL", "AUTO", "MANUAL", "PROFIT", "LOSS"].map(f => (
                  <button key={f} onClick={() => setTradeFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition
                      ${tradeFilter === f ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>{f}</button>
                ))}
              </div>
            </div>
            {filteredTrades.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">No trades yet.</div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                      <th className="p-4 text-left">Time</th>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Symbol</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right">P&L</th>
                      <th className="p-4 text-left">Reason</th>
                      <th className="p-4 text-left">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((t, i) => (
                      <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                        <td className="p-4 text-zinc-400 text-xs whitespace-nowrap">{t.time}</td>
                        <td className={`p-4 font-bold ${t.type === "BUY" ? "text-green-400" : "text-red-400"}`}>{t.type}</td>
                        <td className="p-4 font-bold">{t.symbol}</td>
                        <td className="p-4 text-right">₹{t.price}</td>
                        <td className={`p-4 text-right font-bold ${t.type === "SELL" ? pnlColor(t.pnl) : "text-zinc-500"}`}>
                          {t.type === "SELL" ? `${pnlPrefix(t.pnl)}₹${Math.abs(t.pnl).toFixed(2)}` : "-"}
                        </td>
                        <td className="p-4 text-zinc-400 text-xs max-w-xs truncate">{t.reason}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${t.mode === "AUTO" ? "bg-blue-900 text-blue-300" : "bg-zinc-700 text-zinc-300"}`}>
                            {t.mode}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== WATCHLIST ==================== */}
        {activeTab === "watchlist" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Watchlist ({watchlist.length} stocks)</h2>
            </div>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Add symbol (HDFCBANK.NS / AAPL / BTC-USD)"
                value={newWatchSymbol}
                onChange={(e) => setNewWatchSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-80 text-white outline-none text-sm focus:border-green-500"
              />
              <button onClick={addToWatchlist} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">Add</button>
            </div>
            {["Indian 🇮🇳", "US 🇺🇸", "Crypto ₿"].map((category, ci) => {
              const filtered = watchlist.filter(sym =>
                ci === 0 ? sym.endsWith(".NS") || sym.endsWith(".BO") :
                ci === 1 ? !sym.endsWith(".NS") && !sym.endsWith(".BO") && !sym.includes("-USD") :
                sym.includes("-USD")
              );
              if (filtered.length === 0) return null;
              return (
                <div key={category} className="mb-6">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-3">{category}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                    {filtered.map((sym, i) => (
                      <div key={i} className={`border p-3 rounded-lg flex items-center justify-between ${LARGE_CAP_LIST.has(sym) ? "border-blue-800 bg-blue-900 bg-opacity-20" : "border-zinc-800 bg-zinc-900"}`}>
                        <button onClick={() => { setSymbol(sym); fetchStockData(sym); setActiveTab("dashboard"); }}
                          className="font-bold text-xs hover:text-green-400 transition">{sym}</button>
                        <button onClick={() => removeFromWatchlist(sym)} className="text-zinc-600 hover:text-red-400 text-xs ml-1">✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-sm text-zinc-400 mt-4">
              <p className="font-bold text-white mb-2">Format Guide</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <p>🇮🇳 Indian → <code className="bg-zinc-800 px-1 rounded">RELIANCE.NS</code></p>
                <p>🇺🇸 US → <code className="bg-zinc-800 px-1 rounded">AAPL</code></p>
                <p>₿ Crypto → <code className="bg-zinc-800 px-1 rounded">BTC-USD</code></p>
              </div>
              <p className="mt-2 text-blue-400 text-xs">Blue highlighted = Large Cap (needs stronger signal to buy)</p>
            </div>
          </div>
        )}

        {/* ==================== STATS ==================== */}
        {activeTab === "stats" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Bot Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Win Rate", value: `${stats.win_rate_pct || 0}%`, color: stats.win_rate_pct >= 50 ? "text-green-400" : "text-red-400" },
                { label: "Realized P&L", value: `${pnlPrefix(stats.realized_pnl || 0)}₹${Math.abs(stats.realized_pnl || 0).toFixed(2)}`, color: pnlColor(stats.realized_pnl || 0) },
                { label: "Profitable Sells", value: stats.profitable_sells || 0, color: "text-green-400" },
                { label: "Loss Sells", value: stats.loss_sells || 0, color: "text-red-400" },
                { label: "Total Trades", value: stats.total_trades || 0, color: "text-white" },
                { label: "Auto Trades", value: stats.auto_trades || 0, color: "text-blue-400" },
                { label: "Manual Trades", value: stats.manual_trades || 0, color: "text-zinc-400" },
                { label: "Active Holdings", value: stats.current_holdings || 0, color: "text-purple-400" },
              ].map((s, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-2">{s.label}</p>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h3 className="font-bold text-white mb-4">Current Strategy Config</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: "Profit target (sell when)", value: `+${stats.profit_target_pct || 2}%`, color: "text-green-400" },
                  { label: "Stop loss (cut when)", value: `-${stats.stop_loss_pct || 1.5}%`, color: "text-red-400" },
                  { label: "Large cap min confidence", value: "70%", color: "text-blue-400" },
                  { label: "Small cap min confidence", value: "55%", color: "text-yellow-400" },
                  { label: "Scan interval", value: "Every 5 min", color: "text-purple-400" },
                  { label: "Sell logic", value: "Profit-first only", color: "text-green-400" },
                  { label: "Max position size", value: "15% of cash", color: "text-zinc-300" },
                  { label: "Mode", value: "Paper Trading", color: "text-orange-400" },
                ].map((item, i) => (
                  <div key={i} className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">{item.label}</p>
                    <p className={`font-bold ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const LARGE_CAP_LIST = new Set([
  "RELIANCE.NS","TCS.NS","INFY.NS","HDFCBANK.NS","SBIN.NS",
  "ICICIBANK.NS","KOTAKBANK.NS","LT.NS","BAJFINANCE.NS","HINDUNILVR.NS",
  "AXISBANK.NS","MARUTI.NS","TITAN.NS","SUNPHARMA.NS","TATAMOTORS.NS",
  "NESTLEIND.NS","ULTRACEMCO.NS","AAPL","MSFT","GOOGL","AMZN","NVDA",
  "TSLA","META","JPM","V","JNJ","WMT","UNH","MA","HD"
]);
