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
    overall_pnl: 0, overall_pnl_pct: 0,
  });
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [dailyPnl, setDailyPnl] = useState([]);
  const [stats, setStats] = useState({});
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");
  const [signalFilter, setSignalFilter] = useState("ALL");
  const [tradeFilter, setTradeFilter] = useState("ALL");

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
      setDailyPnl(res.data.reverse());
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
      else { showNotification(`✅ Bought 1 share of ${symbol}`); fetchPnl(); fetchTrades(); fetchStats(); }
    } catch (e) { showNotification("Buy failed", "error"); }
  };

  const sellStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/sell/${symbol}?quantity=1`);
      if (res.data.error) showNotification(res.data.error, "error");
      else { showNotification(`✅ Sold 1 share of ${symbol}`); fetchPnl(); fetchTrades(); fetchStats(); }
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
    fetchWatchlist(); fetchDailyPnl(); fetchStats();
    const interval = setInterval(() => {
      fetchPnl(); fetchSignals(); fetchTrades(); fetchDailyPnl();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  // Helpers
  const pnlColor = (v) => v >= 0 ? "text-green-400" : "text-red-400";
  const pnlBg = (v) => v >= 0 ? "bg-green-900" : "bg-red-900";
  const pnlPrefix = (v) => v >= 0 ? "+" : "";
  const signalBg = (s) => s === "BUY" ? "bg-green-900 border-green-700" : s === "SELL" ? "bg-red-900 border-red-700" : "bg-zinc-800 border-zinc-700";
  const signalColor = (s) => s === "BUY" ? "text-green-400" : s === "SELL" ? "text-red-400" : "text-yellow-400";
  const sentimentLabel = (s) => s === 1 ? "😊 +ve" : s === -1 ? "😟 -ve" : "😐 Neutral";
  const sentimentColor = (s) => s === 1 ? "text-green-400" : s === -1 ? "text-red-400" : "text-zinc-400";

  const filteredSignals = signalFilter === "ALL" ? signals : signals.filter(s => s.signal === signalFilter);
  const filteredTrades = tradeFilter === "ALL" ? trades : trades.filter(t => t.mode === tradeFilter);

  // Daily PnL chart
  const dailyChartData = {
    labels: dailyPnl.map(d => d.date),
    datasets: [{
      label: "Daily P&L %",
      data: dailyPnl.map(d => d.pnl_pct),
      backgroundColor: dailyPnl.map(d => d.pnl_pct >= 0 ? "rgba(34,197,94,0.7)" : "rgba(239,68,68,0.7)"),
      borderColor: dailyPnl.map(d => d.pnl_pct >= 0 ? "#22c55e" : "#ef4444"),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const dailyChartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw >= 0 ? "+" : ""}${ctx.raw?.toFixed(2)}%`
        }
      }
    },
    scales: {
      x: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
      y: {
        ticks: { color: "#9ca3af", callback: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%` },
        grid: { color: "#1f2937" }
      },
    },
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#fff" } }, tooltip: { mode: "index", intersect: false } },
    scales: {
      x: { ticks: { color: "#9ca3af", maxTicksLimit: 8 }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-mono">

      {/* NOTIFICATION */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-xl border text-sm font-bold shadow-2xl transition
          ${notification.type === "error" ? "bg-red-900 border-red-600 text-red-200"
          : notification.type === "info" ? "bg-blue-900 border-blue-600 text-blue-200"
          : "bg-green-900 border-green-600 text-green-200"}`}>
          {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between bg-zinc-900">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <h1 className="text-xl font-bold text-green-400 tracking-widest uppercase">AI Trading Bot</h1>
          <div className="hidden md:flex gap-2">
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-400">SL: 2.5%</span>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-400">TP: 5%</span>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-zinc-700 text-zinc-400">Min: 65%</span>
            <span className="text-xs bg-zinc-800 px-2 py-1 rounded border border-green-900 text-green-400">AUTO ON</span>
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
            {/* SUMMARY */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Cash", value: `₹${pnl.cash?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "text-green-400" },
                { label: "Portfolio Value", value: `₹${pnl.portfolio_value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`, color: "text-blue-400" },
                { label: "Holdings P&L", value: `${pnlPrefix(pnl.total_pnl)}₹${Math.abs(pnl.total_pnl || 0).toFixed(2)}`, color: pnlColor(pnl.total_pnl) },
                { label: "Overall P&L", value: `${pnlPrefix(pnl.overall_pnl_pct)}${pnl.overall_pnl_pct?.toFixed(2)}%`, color: pnlColor(pnl.overall_pnl_pct) },
              ].map((card, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                </div>
              ))}
            </div>

            {/* MANUAL TRADE */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
              <p className="text-zinc-400 text-xs mb-3 font-bold uppercase tracking-widest">Manual Trade</p>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="RELIANCE.NS / AAPL / BTC-USD"
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
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-xl font-bold">{stockData.symbol}</h2>
                    <p className="text-zinc-500 text-xs">Scanned: {stockData.scanned_at}</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border font-bold text-sm ${signalBg(stockData.signal)}`}>
                    <span className={signalColor(stockData.signal)}>{stockData.signal}</span>
                    <span className="text-zinc-400 ml-2">· {stockData.confidence}%</span>
                  </div>
                </div>

                {/* Row 1: Price + RSI + SMA */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                  <div className="bg-zinc-800 p-3 rounded-lg col-span-2 md:col-span-1">
                    <p className="text-zinc-500 text-xs mb-1">Price</p>
                    <p className="text-xl font-bold text-white">₹{stockData.current_price}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">RSI</p>
                    <p className={`text-lg font-bold ${stockData.RSI < 35 ? "text-green-400" : stockData.RSI > 65 ? "text-red-400" : "text-yellow-400"}`}>
                      {stockData.RSI}
                    </p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">SMA 20</p>
                    <p className="text-lg font-bold text-blue-400">{stockData.SMA20}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">SMA 50</p>
                    <p className="text-lg font-bold text-purple-400">{stockData.SMA50}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">SMA 200</p>
                    <p className="text-lg font-bold text-orange-400">{stockData.SMA200}</p>
                  </div>
                </div>

                {/* Row 2: MACD + BB + Volume + Sentiment + Score */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">MACD</p>
                    <p className={`text-lg font-bold ${stockData.MACD_bullish ? "text-green-400" : "text-red-400"}`}>
                      {stockData.MACD_bullish ? "▲ Bull" : "▼ Bear"}
                    </p>
                    <p className="text-zinc-600 text-xs">{stockData.MACD?.toFixed(3)}</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Bollinger %</p>
                    <p className={`text-lg font-bold ${stockData.BB_position < 20 ? "text-green-400" : stockData.BB_position > 80 ? "text-red-400" : "text-yellow-400"}`}>
                      {stockData.BB_position}%
                    </p>
                    <p className="text-zinc-600 text-xs">of band</p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Volume</p>
                    <p className={`text-lg font-bold ${stockData.volume_confirms ? "text-green-400" : "text-zinc-400"}`}>
                      {stockData.volume_confirms ? "✓ Strong" : "✗ Weak"}
                    </p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">News</p>
                    <p className={`text-lg font-bold ${sentimentColor(stockData.sentiment)}`}>
                      {sentimentLabel(stockData.sentiment)}
                    </p>
                  </div>
                  <div className="bg-zinc-800 p-3 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Score</p>
                    <p className="text-lg font-bold">
                      <span className="text-green-400">{stockData.buy_score}B</span>
                      <span className="text-zinc-500"> / </span>
                      <span className="text-red-400">{stockData.sell_score}S</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* PRICE CHART */}
            {chartData.labels.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
                <h2 className="text-lg font-bold mb-4">90-Day Price Chart</h2>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* HOLDINGS */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h2 className="text-lg font-bold mb-4">Holdings — Live P&L</h2>
              {Object.keys(pnl.holdings).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-zinc-500 uppercase border-b border-zinc-800">
                        <th className="pb-3 text-left">Symbol</th>
                        <th className="pb-3 text-right">Qty</th>
                        <th className="pb-3 text-right">Avg Buy</th>
                        <th className="pb-3 text-right">Live Price</th>
                        <th className="pb-3 text-right">Value</th>
                        <th className="pb-3 text-right">P&L ₹</th>
                        <th className="pb-3 text-right">P&L %</th>
                        <th className="pb-3 text-right">Stop Loss</th>
                        <th className="pb-3 text-right">Take Profit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pnl.holdings).map(([sym, data]) => (
                        <tr key={sym} className="border-b border-zinc-800 hover:bg-zinc-800 transition cursor-pointer"
                          onClick={() => { setSymbol(sym); fetchStockData(sym); }}>
                          <td className="py-4 font-bold text-white">{sym}</td>
                          <td className="py-4 text-right text-zinc-400">{data.quantity}</td>
                          <td className="py-4 text-right text-zinc-400">₹{data.avg_buy_price}</td>
                          <td className="py-4 text-right font-bold text-white">₹{data.current_price}</td>
                          <td className="py-4 text-right text-blue-400">₹{data.current_value}</td>
                          <td className={`py-4 text-right font-bold ${pnlColor(data.pnl)}`}>
                            {pnlPrefix(data.pnl)}₹{Math.abs(data.pnl).toFixed(2)}
                          </td>
                          <td className={`py-4 text-right font-bold ${pnlColor(data.pnl_pct)}`}>
                            {pnlPrefix(data.pnl_pct)}{data.pnl_pct.toFixed(2)}%
                          </td>
                          <td className="py-4 text-right text-red-400 text-xs">₹{data.stop_loss_price}</td>
                          <td className="py-4 text-right text-green-400 text-xs">₹{data.take_profit_price}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-zinc-700 font-bold">
                        <td className="pt-4 text-zinc-400">TOTAL</td>
                        <td></td>
                        <td className="pt-4 text-right text-zinc-400">₹{pnl.total_invested?.toFixed(2)}</td>
                        <td></td>
                        <td className="pt-4 text-right text-blue-400">₹{pnl.total_current_value?.toFixed(2)}</td>
                        <td className={`pt-4 text-right ${pnlColor(pnl.total_pnl)}`}>
                          {pnlPrefix(pnl.total_pnl)}₹{Math.abs(pnl.total_pnl || 0).toFixed(2)}
                        </td>
                        <td className={`pt-4 text-right ${pnlColor(pnl.total_pnl_pct)}`}>
                          {pnlPrefix(pnl.total_pnl_pct)}{pnl.total_pnl_pct?.toFixed(2)}%
                        </td>
                        <td></td><td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-zinc-500">No holdings. Bot auto-buys on strong signals (≥65%).</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== DAILY P&L ==================== */}
        {activeTab === "daily p&l" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Daily P&L Performance</h2>

            {/* Summary Cards */}
            {dailyPnl.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Today's P&L</p>
                  <p className={`text-2xl font-bold ${pnlColor(dailyPnl[dailyPnl.length-1]?.pnl_pct)}`}>
                    {pnlPrefix(dailyPnl[dailyPnl.length-1]?.pnl_pct)}{dailyPnl[dailyPnl.length-1]?.pnl_pct?.toFixed(2)}%
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Best Day</p>
                  <p className="text-2xl font-bold text-green-400">
                    +{Math.max(...dailyPnl.map(d => d.pnl_pct)).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Worst Day</p>
                  <p className="text-2xl font-bold text-red-400">
                    {Math.min(...dailyPnl.map(d => d.pnl_pct)).toFixed(2)}%
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-1">Profitable Days</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {dailyPnl.filter(d => d.pnl_pct >= 0).length}/{dailyPnl.length}
                  </p>
                </div>
              </div>
            )}

            {/* Bar Chart */}
            {dailyPnl.length > 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-6">
                <h3 className="text-md font-bold mb-4">Daily P&L % (Last 30 Days)</h3>
                <Bar data={dailyChartData} options={dailyChartOptions} />
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500 mb-6">
                <p className="text-lg">No daily data yet.</p>
                <p className="text-sm mt-2">Click ⚡ Scan Now to record today's snapshot.</p>
              </div>
            )}

            {/* Daily Table */}
            {dailyPnl.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                      <th className="p-4 text-left">Date</th>
                      <th className="p-4 text-right">Portfolio Value</th>
                      <th className="p-4 text-right">P&L ₹</th>
                      <th className="p-4 text-right">P&L %</th>
                      <th className="p-4 text-left">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...dailyPnl].reverse().map((d, i) => (
                      <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                        <td className="p-4 font-bold">{d.date}</td>
                        <td className="p-4 text-right text-blue-400">₹{d.portfolio_value?.toLocaleString("en-IN")}</td>
                        <td className={`p-4 text-right font-bold ${pnlColor(d.pnl)}`}>
                          {pnlPrefix(d.pnl)}₹{Math.abs(d.pnl).toFixed(2)}
                        </td>
                        <td className={`p-4 text-right font-bold ${pnlColor(d.pnl_pct)}`}>
                          {pnlPrefix(d.pnl_pct)}{d.pnl_pct.toFixed(2)}%
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-zinc-700 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${d.pnl_pct >= 0 ? "bg-green-400" : "bg-red-400"}`}
                                style={{ width: `${Math.min(100, Math.abs(d.pnl_pct) * 10)}%` }}></div>
                            </div>
                            <span className={`text-xs ${pnlColor(d.pnl_pct)}`}>
                              {d.pnl_pct >= 0 ? "▲" : "▼"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ==================== SIGNALS ==================== */}
        {activeTab === "signals" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Market Signals ({signals.length} stocks)</h2>
              <div className="flex gap-2">
                {["ALL", "BUY", "SELL", "HOLD"].map(f => (
                  <button key={f} onClick={() => setSignalFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition
                      ${signalFilter === f ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                    {f}
                  </button>
                ))}
                <button onClick={triggerScan} className="bg-blue-700 hover:bg-blue-600 px-4 py-1 rounded-lg text-xs font-bold transition ml-2">
                  ⚡ Scan
                </button>
              </div>
            </div>

            {filteredSignals.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">
                <p>No signals yet. Click ⚡ Scan to analyze all {watchlist.length} watchlist stocks.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSignals.map((s, i) => (
                  <div key={i}
                    className={`border rounded-xl p-4 cursor-pointer hover:brightness-110 transition ${signalBg(s.signal)}`}
                    onClick={() => { setSymbol(s.symbol); fetchStockData(s.symbol); setActiveTab("dashboard"); }}>
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-lg">{s.symbol}</p>
                      <span className={`font-bold text-sm px-2 py-0.5 rounded ${signalColor(s.signal)}`}>{s.signal}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-3">₹{s.current_price}</p>
                    <div className="grid grid-cols-2 gap-1 text-xs mb-3">
                      <span className="text-zinc-400">RSI: <span className={s.RSI < 35 ? "text-green-400" : s.RSI > 65 ? "text-red-400" : "text-yellow-400"}>{s.RSI}</span></span>
                      <span className="text-zinc-400">MACD: <span className={s.MACD_bullish ? "text-green-400" : "text-red-400"}>{s.MACD_bullish ? "▲Bull" : "▼Bear"}</span></span>
                      <span className="text-zinc-400">BB: <span className="text-white">{s.BB_position}%</span></span>
                      <span className="text-zinc-400">Vol: <span className={s.volume_confirms ? "text-green-400" : "text-zinc-500"}>{s.volume_confirms ? "Strong" : "Weak"}</span></span>
                      <span className="text-zinc-400">News: <span className={sentimentColor(s.sentiment)}>{sentimentLabel(s.sentiment)}</span></span>
                      <span className="text-zinc-400">Score: <span className="text-green-400">{s.buy_score}B</span>/<span className="text-red-400">{s.sell_score}S</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-zinc-700 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${s.signal === "BUY" ? "bg-green-400" : s.signal === "SELL" ? "bg-red-400" : "bg-yellow-400"}`}
                          style={{ width: `${s.confidence}%` }}></div>
                      </div>
                      <span className="text-xs text-zinc-400 w-8">{s.confidence}%</span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-2">{s.scanned_at}</p>
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
                {["ALL", "AUTO", "MANUAL"].map(f => (
                  <button key={f} onClick={() => setTradeFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition
                      ${tradeFilter === f ? "bg-blue-700 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
                    {f}
                  </button>
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
                      <th className="p-4 text-right">Qty</th>
                      <th className="p-4 text-right">Conf</th>
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
                        <td className="p-4 text-right">{t.quantity}</td>
                        <td className="p-4 text-right text-zinc-400">{t.confidence > 0 ? `${t.confidence}%` : "-"}</td>
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
                placeholder="Add symbol (e.g. HDFCBANK.NS / AAPL / BTC-USD)"
                value={newWatchSymbol}
                onChange={(e) => setNewWatchSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-80 text-white outline-none text-sm focus:border-green-500"
              />
              <button onClick={addToWatchlist} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">Add</button>
            </div>

            {/* Group by category */}
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
                      <div key={i} className="bg-zinc-900 border border-zinc-800 p-3 rounded-lg flex items-center justify-between">
                        <button onClick={() => { setSymbol(sym); fetchStockData(sym); setActiveTab("dashboard"); }}
                          className="font-bold text-xs hover:text-green-400 transition">{sym}</button>
                        <button onClick={() => removeFromWatchlist(sym)} className="text-zinc-600 hover:text-red-400 text-xs ml-1 transition">✕</button>
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
                <p>🇺🇸 US → <code className="bg-zinc-800 px-1 rounded">AAPL</code>, <code className="bg-zinc-800 px-1 rounded">MSFT</code></p>
                <p>₿ Crypto → <code className="bg-zinc-800 px-1 rounded">BTC-USD</code>, <code className="bg-zinc-800 px-1 rounded">ETH-USD</code></p>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STATS ==================== */}
        {activeTab === "stats" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Bot Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Trades", value: stats.total_trades || 0, color: "text-white" },
                { label: "Total Buys", value: stats.total_buys || 0, color: "text-green-400" },
                { label: "Total Sells", value: stats.total_sells || 0, color: "text-red-400" },
                { label: "Auto Trades", value: stats.auto_trades || 0, color: "text-blue-400" },
                { label: "Manual Trades", value: stats.manual_trades || 0, color: "text-zinc-400" },
                { label: "Watchlist Size", value: stats.watchlist_size || 0, color: "text-purple-400" },
              ].map((s, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                  <p className="text-zinc-500 text-xs mb-2">{s.label}</p>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Config Info */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h3 className="font-bold text-white mb-4">Bot Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {[
                  { label: "Stop Loss", value: "2.5%", color: "text-red-400" },
                  { label: "Take Profit", value: "5.0%", color: "text-green-400" },
                  { label: "Min Confidence", value: "65%", color: "text-blue-400" },
                  { label: "Max Position", value: "15% cash", color: "text-yellow-400" },
                  { label: "Scan Interval", value: "5 min", color: "text-purple-400" },
                  { label: "Indicators", value: "RSI+MACD+BB+Vol+News", color: "text-white" },
                  { label: "Starting Capital", value: "₹1,00,000", color: "text-zinc-300" },
                  { label: "Trading Mode", value: "Paper Trading", color: "text-orange-400" },
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
