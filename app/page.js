"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
);

const API = "https://ai-trading-backend-ny5g.onrender.com";

export default function Home() {
  const [pnl, setPnl] = useState({
    holdings: {}, total_invested: 0,
    total_current_value: 0, total_pnl: 0,
    total_pnl_pct: 0, cash: 0, portfolio_value: 0,
  });
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

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

  const fetchStockData = async (sym) => {
    const target = sym || symbol;
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
            label: target,
            data: histRes.data.prices,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.08)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            pointRadius: 0,
            pointHoverRadius: 4,
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
      else { showNotification(`✅ Bought 1 share of ${symbol}`); fetchPnl(); fetchTrades(); }
    } catch (e) { showNotification("Buy failed", "error"); }
  };

  const sellStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/sell/${symbol}?quantity=1`);
      if (res.data.error) showNotification(res.data.error, "error");
      else { showNotification(`✅ Sold 1 share of ${symbol}`); fetchPnl(); fetchTrades(); }
    } catch (e) { showNotification("Sell failed", "error"); }
  };

  const triggerScan = async () => {
    showNotification("🔍 Scanning market...", "info");
    try {
      await axios.post(`${API}/scan`);
      await Promise.all([fetchSignals(), fetchPnl(), fetchTrades()]);
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
    fetchPnl(); fetchSignals(); fetchTrades(); fetchWatchlist();
    const interval = setInterval(() => {
      fetchPnl(); fetchSignals(); fetchTrades();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const pnlColor = (val) => val >= 0 ? "text-green-400" : "text-red-400";
  const pnlPrefix = (val) => val >= 0 ? "+" : "";
  const signalBg = (s) => s === "BUY" ? "bg-green-900 border-green-700" : s === "SELL" ? "bg-red-900 border-red-700" : "bg-yellow-900 border-yellow-700";
  const signalColor = (s) => s === "BUY" ? "text-green-400" : s === "SELL" ? "text-red-400" : "text-yellow-400";
  const sentimentLabel = (s) => s === 1 ? "😊 Positive" : s === -1 ? "😟 Negative" : "😐 Neutral";
  const sentimentColor = (s) => s === 1 ? "text-green-400" : s === -1 ? "text-red-400" : "text-zinc-400";

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
        <div className={`fixed top-5 right-5 z-50 px-6 py-3 rounded-xl border text-sm font-bold shadow-lg
          ${notification.type === "error" ? "bg-red-900 border-red-600 text-red-200"
          : notification.type === "info" ? "bg-blue-900 border-blue-600 text-blue-200"
          : "bg-green-900 border-green-600 text-green-200"}`}>
          {notification.msg}
        </div>
      )}

      {/* HEADER */}
      <div className="border-b border-zinc-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
          <h1 className="text-xl font-bold text-green-400 tracking-widest uppercase">AI Trading Bot</h1>
          <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-700">
            AUTO · SL: 2.5% · TP: 5%
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Updated: {lastUpdated}</span>
          <button onClick={triggerScan} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
            ⚡ Scan Now
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-zinc-800 px-8 flex gap-1 pt-2">
        {["dashboard", "signals", "trades", "watchlist"].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-bold uppercase tracking-wide rounded-t-lg transition
              ${activeTab === tab ? "bg-zinc-900 text-green-400 border-t border-l border-r border-zinc-700" : "text-zinc-500 hover:text-zinc-300"}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8">

        {/* ==================== DASHBOARD ==================== */}
        {activeTab === "dashboard" && (
          <div>
            {/* SUMMARY CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Cash</p>
                <p className="text-2xl font-bold text-green-400">₹{pnl.cash?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Portfolio Value</p>
                <p className="text-2xl font-bold text-blue-400">₹{pnl.portfolio_value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">Total P&L</p>
                <p className={`text-2xl font-bold ${pnlColor(pnl.total_pnl)}`}>
                  {pnlPrefix(pnl.total_pnl)}₹{Math.abs(pnl.total_pnl || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
                <p className="text-zinc-500 text-xs mb-1">P&L %</p>
                <p className={`text-2xl font-bold ${pnlColor(pnl.total_pnl_pct)}`}>
                  {pnlPrefix(pnl.total_pnl_pct)}{pnl.total_pnl_pct?.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* MANUAL TRADE */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
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
                  {loading ? "Loading..." : "Search"}
                </button>
                <button onClick={buyStock} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">Buy 1</button>
                <button onClick={sellStock} className="bg-red-700 hover:bg-red-600 px-5 py-3 rounded-lg text-sm font-bold transition">Sell 1</button>
              </div>
            </div>

            {/* STOCK ANALYSIS — Full indicators */}
            {stockData && !stockData.error && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">{stockData.symbol}</h2>
                  <span className={`px-4 py-2 rounded-lg border font-bold text-sm ${signalBg(stockData.signal)}`}>
                    {stockData.signal} · {stockData.confidence}% confidence
                  </span>
                </div>

                {/* Price + RSI + SMA */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Price</p>
                    <p className="text-xl font-bold text-green-400">₹{stockData.current_price}</p>
                  </div>
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">RSI</p>
                    <p className={`text-xl font-bold ${stockData.RSI < 30 ? "text-green-400" : stockData.RSI > 70 ? "text-red-400" : "text-yellow-400"}`}>
                      {stockData.RSI}
                    </p>
                  </div>
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">SMA 20</p>
                    <p className="text-xl font-bold text-blue-400">{stockData.SMA20}</p>
                  </div>
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">SMA 50</p>
                    <p className="text-xl font-bold text-purple-400">{stockData.SMA50}</p>
                  </div>
                </div>

                {/* MACD + Volume + Sentiment */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">MACD</p>
                    <p className={`text-lg font-bold ${stockData.MACD_bullish ? "text-green-400" : "text-red-400"}`}>
                      {stockData.MACD_bullish ? "▲ Bullish" : "▼ Bearish"}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">{stockData.MACD?.toFixed(4)}</p>
                  </div>
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Volume</p>
                    <p className={`text-lg font-bold ${stockData.volume_confirms ? "text-green-400" : "text-zinc-400"}`}>
                      {stockData.volume_confirms ? "✓ Strong" : "✗ Weak"}
                    </p>
                  </div>
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">News Sentiment</p>
                    <p className={`text-lg font-bold ${sentimentColor(stockData.sentiment)}`}>
                      {sentimentLabel(stockData.sentiment)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* CHART */}
            {chartData.labels.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
                <h2 className="text-lg font-bold mb-4">30-Day Price Chart</h2>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* HOLDINGS WITH LIVE P&L + SL/TP */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h2 className="text-lg font-bold mb-4">Holdings — Live P&L</h2>
              {Object.keys(pnl.holdings).length > 0 ? (
                <div>
                  <div className="grid grid-cols-7 text-xs text-zinc-500 uppercase pb-2 border-b border-zinc-800 mb-2">
                    <span>Symbol</span>
                    <span className="text-right">Avg Buy</span>
                    <span className="text-right">Live Price</span>
                    <span className="text-right">Value</span>
                    <span className="text-right">P&L</span>
                    <span className="text-right">Stop Loss</span>
                    <span className="text-right">Take Profit</span>
                  </div>
                  {Object.entries(pnl.holdings).map(([sym, data]) => (
                    <div key={sym}
                      className="grid grid-cols-7 py-4 border-b border-zinc-800 items-center hover:bg-zinc-800 transition cursor-pointer"
                      onClick={() => { setSymbol(sym); fetchStockData(sym); }}>
                      <div>
                        <p className="font-bold text-white">{sym}</p>
                        <p className="text-zinc-500 text-xs">{data.quantity} shares</p>
                      </div>
                      <span className="text-right text-zinc-400">₹{data.avg_buy_price}</span>
                      <span className="text-right text-white font-bold">₹{data.current_price}</span>
                      <span className="text-right text-blue-400">₹{data.current_value}</span>
                      <div className="text-right">
                        <p className={`font-bold ${pnlColor(data.pnl)}`}>
                          {pnlPrefix(data.pnl)}₹{Math.abs(data.pnl).toFixed(2)}
                        </p>
                        <p className={`text-xs ${pnlColor(data.pnl_pct)}`}>
                          {pnlPrefix(data.pnl_pct)}{data.pnl_pct.toFixed(2)}%
                        </p>
                      </div>
                      <span className="text-right text-red-400 text-sm">₹{data.stop_loss_price}</span>
                      <span className="text-right text-green-400 text-sm">₹{data.take_profit_price}</span>
                    </div>
                  ))}
                  {/* TOTAL ROW */}
                  <div className="grid grid-cols-7 py-4 mt-2 items-center font-bold border-t border-zinc-700">
                    <span className="text-zinc-400 text-sm">TOTAL</span>
                    <span className="text-right text-zinc-400 text-sm">₹{pnl.total_invested?.toFixed(2)}</span>
                    <span></span>
                    <span className="text-right text-blue-400 text-sm">₹{pnl.total_current_value?.toFixed(2)}</span>
                    <div className="text-right">
                      <p className={`font-bold ${pnlColor(pnl.total_pnl)}`}>
                        {pnlPrefix(pnl.total_pnl)}₹{Math.abs(pnl.total_pnl || 0).toFixed(2)}
                      </p>
                      <p className={`text-xs ${pnlColor(pnl.total_pnl_pct)}`}>
                        {pnlPrefix(pnl.total_pnl_pct)}{pnl.total_pnl_pct?.toFixed(2)}%
                      </p>
                    </div>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              ) : (
                <p className="text-zinc-500">No holdings. Bot auto-buys on strong signals (≥65% confidence).</p>
              )}
            </div>
          </div>
        )}

        {/* ==================== SIGNALS ==================== */}
        {activeTab === "signals" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Live Market Signals</h2>
              <button onClick={triggerScan} className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-bold transition">
                ⚡ Scan Now
              </button>
            </div>
            {signals.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">
                <p className="text-lg">No signals yet.</p>
                <p className="text-sm mt-2">Click "Scan Now" or wait for auto-scan (every 5 min)</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {signals.map((s, i) => (
                  <div key={i}
                    className={`border rounded-xl p-4 cursor-pointer hover:brightness-110 transition ${signalBg(s.signal)}`}
                    onClick={() => { setSymbol(s.symbol); fetchStockData(s.symbol); setActiveTab("dashboard"); }}>
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-bold text-lg">{s.symbol}</p>
                      <span className={`font-bold text-sm ${signalColor(s.signal)}`}>{s.signal}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-3">₹{s.current_price}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <span className="text-zinc-400">RSI: <span className="text-white">{s.RSI}</span></span>
                      <span className="text-zinc-400">MACD: <span className={s.MACD_bullish ? "text-green-400" : "text-red-400"}>{s.MACD_bullish ? "▲" : "▼"}</span></span>
                      <span className="text-zinc-400">Vol: <span className={s.volume_confirms ? "text-green-400" : "text-zinc-400"}>{s.volume_confirms ? "Strong" : "Weak"}</span></span>
                      <span className="text-zinc-400">News: <span className={sentimentColor(s.sentiment)}>{sentimentLabel(s.sentiment)}</span></span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 bg-zinc-700 rounded-full h-1.5 mr-3">
                        <div className={`h-1.5 rounded-full ${s.signal === "BUY" ? "bg-green-400" : s.signal === "SELL" ? "bg-red-400" : "bg-yellow-400"}`}
                          style={{ width: `${s.confidence}%` }}></div>
                      </div>
                      <span className="text-xs text-zinc-400">{s.confidence}%</span>
                    </div>
                    <p className="text-xs text-zinc-500">{s.scanned_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== TRADES ==================== */}
        {activeTab === "trades" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Trade History</h2>
            {trades.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">No trades yet.</div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase">
                      <th className="p-4 text-left">Time</th>
                      <th className="p-4 text-left">Type</th>
                      <th className="p-4 text-left">Symbol</th>
                      <th className="p-4 text-right">Price</th>
                      <th className="p-4 text-right">Qty</th>
                      <th className="p-4 text-left">Reason</th>
                      <th className="p-4 text-left">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                        <td className="p-4 text-zinc-400 text-xs">{t.time}</td>
                        <td className={`p-4 font-bold ${t.type === "BUY" ? "text-green-400" : "text-red-400"}`}>{t.type}</td>
                        <td className="p-4 font-bold">{t.symbol}</td>
                        <td className="p-4 text-right">₹{t.price}</td>
                        <td className="p-4 text-right">{t.quantity}</td>
                        <td className="p-4 text-zinc-400 text-xs">{t.reason}</td>
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
            <h2 className="text-lg font-bold mb-6">Watchlist</h2>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Add symbol (e.g. HDFCBANK.NS)"
                value={newWatchSymbol}
                onChange={(e) => setNewWatchSymbol(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
                className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 w-64 text-white outline-none text-sm focus:border-green-500"
              />
              <button onClick={addToWatchlist} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">Add</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {watchlist.map((sym, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                  <button onClick={() => { setSymbol(sym); fetchStockData(sym); setActiveTab("dashboard"); }}
                    className="font-bold text-sm hover:text-green-400 transition">{sym}</button>
                  <button onClick={() => removeFromWatchlist(sym)} className="text-zinc-600 hover:text-red-400 text-xs ml-2 transition">✕</button>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-sm text-zinc-400">
              <p className="font-bold text-white mb-2">Symbol Format</p>
              <p>Indian → <code className="bg-zinc-800 px-1 rounded">RELIANCE.NS</code></p>
              <p className="mt-1">US → <code className="bg-zinc-800 px-1 rounded">AAPL</code>, <code className="bg-zinc-800 px-1 rounded">GOOGL</code></p>
              <p className="mt-1">Crypto → <code className="bg-zinc-800 px-1 rounded">BTC-USD</code></p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
