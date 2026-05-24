"use client";

import { useEffect, useState, useRef } from "react";
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
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// -----------------------------------------------
// CHANGE THIS to your Render URL after deployment
// For now it points to your local backend
// -----------------------------------------------
const API = "https://ai-trading-backend-ny5g.onrender.com";

export default function Home() {
  const [portfolio, setPortfolio] = useState({
    cash: 0,
    stocks: {},
    total_portfolio_value: 0,
  });
  const [symbol, setSymbol] = useState("");
  const [stockData, setStockData] = useState(null);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(false);
  const [botStatus, setBotStatus] = useState("ACTIVE");
  const [lastUpdated, setLastUpdated] = useState("");
  const [newWatchSymbol, setNewWatchSymbol] = useState("");
  const [notification, setNotification] = useState(null);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // -----------------------------------------------
  // FETCH PORTFOLIO
  // -----------------------------------------------
  const fetchPortfolio = async () => {
    try {
      const res = await axios.get(`${API}/portfolio/value`);
      setPortfolio(res.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Portfolio error:", e);
    }
  };

  // -----------------------------------------------
  // FETCH SIGNALS (auto-bot results)
  // -----------------------------------------------
  const fetchSignals = async () => {
    try {
      const res = await axios.get(`${API}/signals`);
      setSignals(res.data);
    } catch (e) {}
  };

  // -----------------------------------------------
  // FETCH TRADE HISTORY
  // -----------------------------------------------
  const fetchTrades = async () => {
    try {
      const res = await axios.get(`${API}/trades`);
      setTrades(res.data);
    } catch (e) {}
  };

  // -----------------------------------------------
  // FETCH WATCHLIST
  // -----------------------------------------------
  const fetchWatchlist = async () => {
    try {
      const res = await axios.get(`${API}/watchlist`);
      setWatchlist(res.data);
    } catch (e) {}
  };

  // -----------------------------------------------
  // SEARCH STOCK
  // -----------------------------------------------
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
          datasets: [
            {
              label: target,
              data: histRes.data.prices,
              borderColor: "#22c55e",
              backgroundColor: "rgba(34,197,94,0.08)",
              borderWidth: 2,
              tension: 0.4,
              fill: true,
              pointRadius: 0,
              pointHoverRadius: 4,
            },
          ],
        });
      }
    } catch (e) {
      showNotification("Could not fetch stock data", "error");
    }
    setLoading(false);
  };

  // -----------------------------------------------
  // BUY
  // -----------------------------------------------
  const buyStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/buy/${symbol}?quantity=1`);
      if (res.data.error) {
        showNotification(res.data.error, "error");
      } else {
        showNotification(`✅ Bought 1 share of ${symbol}`);
        fetchPortfolio();
        fetchTrades();
      }
    } catch (e) {
      showNotification("Buy failed", "error");
    }
  };

  // -----------------------------------------------
  // SELL
  // -----------------------------------------------
  const sellStock = async () => {
    if (!symbol) return;
    try {
      const res = await axios.post(`${API}/sell/${symbol}?quantity=1`);
      if (res.data.error) {
        showNotification(res.data.error, "error");
      } else {
        showNotification(`✅ Sold 1 share of ${symbol}`);
        fetchPortfolio();
        fetchTrades();
      }
    } catch (e) {
      showNotification("Sell failed", "error");
    }
  };

  // -----------------------------------------------
  // TRIGGER MANUAL SCAN
  // -----------------------------------------------
  const triggerScan = async () => {
    showNotification("🔍 Scanning market...", "info");
    try {
      await axios.post(`${API}/scan`);
      await fetchSignals();
      await fetchPortfolio();
      await fetchTrades();
      showNotification("✅ Scan complete!");
    } catch (e) {
      showNotification("Scan failed", "error");
    }
  };

  // -----------------------------------------------
  // ADD TO WATCHLIST
  // -----------------------------------------------
  const addToWatchlist = async () => {
    if (!newWatchSymbol) return;
    try {
      await axios.post(`${API}/watchlist/add/${newWatchSymbol}`);
      setNewWatchSymbol("");
      fetchWatchlist();
      showNotification(`Added ${newWatchSymbol} to watchlist`);
    } catch (e) {}
  };

  // -----------------------------------------------
  // REMOVE FROM WATCHLIST
  // -----------------------------------------------
  const removeFromWatchlist = async (sym) => {
    try {
      await axios.delete(`${API}/watchlist/remove/${sym}`);
      fetchWatchlist();
    } catch (e) {}
  };

  // -----------------------------------------------
  // AUTO REFRESH every 10 seconds
  // -----------------------------------------------
  useEffect(() => {
    fetchPortfolio();
    fetchSignals();
    fetchTrades();
    fetchWatchlist();

    const interval = setInterval(() => {
      fetchPortfolio();
      fetchSignals();
      fetchTrades();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------
  // SIGNAL COLOR
  // -----------------------------------------------
  const signalColor = (s) => {
    if (s === "BUY") return "text-green-400";
    if (s === "SELL") return "text-red-400";
    return "text-yellow-400";
  };

  const signalBg = (s) => {
    if (s === "BUY") return "bg-green-900 border-green-700";
    if (s === "SELL") return "bg-red-900 border-red-700";
    return "bg-yellow-900 border-yellow-700";
  };

  const tradeColor = (t) =>
    t === "BUY" ? "text-green-400" : "text-red-400";

  // -----------------------------------------------
  // CHART OPTIONS
  // -----------------------------------------------
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: { ticks: { color: "#9ca3af", maxTicksLimit: 8 }, grid: { color: "#1f2937" } },
      y: { ticks: { color: "#9ca3af" }, grid: { color: "#1f2937" } },
    },
  };

  // -----------------------------------------------
  // UI
  // -----------------------------------------------
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
          <h1 className="text-xl font-bold text-green-400 tracking-widest uppercase">
            AI Trading Bot
          </h1>
          <span className="text-xs text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-700">
            AUTO TRADING: {botStatus}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>Updated: {lastUpdated}</span>
          <button
            onClick={triggerScan}
            className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition"
          >
            ⚡ Run Scan Now
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-zinc-800 px-8 flex gap-1 pt-2">
        {["dashboard", "signals", "trades", "watchlist"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-bold uppercase tracking-wide rounded-t-lg transition
              ${activeTab === tab
                ? "bg-zinc-900 text-green-400 border-t border-l border-r border-zinc-700"
                : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8">

        {/* ======================== DASHBOARD ======================== */}
        {activeTab === "dashboard" && (
          <div>
            {/* PORTFOLIO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <p className="text-zinc-500 text-sm mb-2">Cash Balance</p>
                <p className="text-3xl font-bold text-green-400">
                  ₹ {portfolio.cash?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <p className="text-zinc-500 text-sm mb-2">Portfolio Value</p>
                <p className="text-3xl font-bold text-blue-400">
                  ₹ {portfolio.total_portfolio_value?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
                <p className="text-zinc-500 text-sm mb-2">P&L</p>
                <p className={`text-3xl font-bold ${(portfolio.total_portfolio_value - 100000) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {(portfolio.total_portfolio_value - 100000) >= 0 ? "+" : ""}
                  ₹ {(portfolio.total_portfolio_value - 100000).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* SEARCH + BUY/SELL */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
              <p className="text-zinc-400 text-sm mb-3 font-bold uppercase tracking-widest">Manual Trade</p>
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
                <button onClick={buyStock} className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition">
                  Buy 1
                </button>
                <button onClick={sellStock} className="bg-red-700 hover:bg-red-600 px-5 py-3 rounded-lg text-sm font-bold transition">
                  Sell 1
                </button>
              </div>
            </div>

            {/* STOCK ANALYSIS CARD */}
            {stockData && !stockData.error && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-bold">{stockData.symbol}</h2>
                  <span className={`px-4 py-2 rounded-lg border font-bold text-sm ${signalBg(stockData.signal)}`}>
                    {stockData.signal} · {stockData.confidence}% confidence
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-zinc-800 p-4 rounded-lg">
                    <p className="text-zinc-500 text-xs mb-1">Price</p>
                    <p className="text-xl font-bold text-green-400">₹ {stockData.current_price}</p>
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
              </div>
            )}

            {/* LINE CHART */}
            {chartData.labels.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl mb-8">
                <h2 className="text-lg font-bold mb-4">30-Day Price Chart</h2>
                <Line data={chartData} options={chartOptions} />
              </div>
            )}

            {/* HOLDINGS */}
            <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl">
              <h2 className="text-lg font-bold mb-4">Holdings</h2>
              {Object.keys(portfolio.stocks).length > 0 ? (
                Object.entries(portfolio.stocks).map(([sym, data]) => (
                  <div key={sym} className="border-b border-zinc-800 py-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-lg">{sym}</p>
                      <p className="text-zinc-500 text-sm">
                        {data.quantity} shares · ₹{data.current_price} each
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold text-lg">₹ {data.total_value}</p>
                      <div className="flex gap-2 mt-1 justify-end">
                        <button
                          onClick={() => { setSymbol(sym); fetchStockData(sym); setActiveTab("dashboard"); }}
                          className="text-xs bg-zinc-800 px-2 py-1 rounded hover:bg-zinc-700 transition"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-zinc-500">No holdings. Bot will auto-buy when signals appear.</p>
              )}
            </div>
          </div>
        )}

        {/* ======================== SIGNALS ======================== */}
        {activeTab === "signals" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold">Live Market Signals</h2>
              <button
                onClick={triggerScan}
                className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-bold transition"
              >
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
                  <div
                    key={i}
                    className={`border rounded-xl p-4 cursor-pointer hover:brightness-110 transition ${signalBg(s.signal)}`}
                    onClick={() => { setSymbol(s.symbol); fetchStockData(s.symbol); setActiveTab("dashboard"); }}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="font-bold text-lg">{s.symbol}</p>
                      <span className={`font-bold text-sm ${signalColor(s.signal)}`}>{s.signal}</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-2">₹ {s.current_price}</p>
                    <div className="flex gap-4 text-xs text-zinc-400 mb-2">
                      <span>RSI {s.RSI}</span>
                      <span>SMA20 {s.SMA20}</span>
                      <span>SMA50 {s.SMA50}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex-1 bg-zinc-700 rounded-full h-1.5 mr-3">
                        <div
                          className={`h-1.5 rounded-full ${s.signal === "BUY" ? "bg-green-400" : s.signal === "SELL" ? "bg-red-400" : "bg-yellow-400"}`}
                          style={{ width: `${s.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-zinc-400">{s.confidence}%</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">{s.scanned_at}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================== TRADES ======================== */}
        {activeTab === "trades" && (
          <div>
            <h2 className="text-lg font-bold mb-6">Trade History</h2>
            {trades.length === 0 ? (
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-xl text-center text-zinc-500">
                No trades yet.
              </div>
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
                      <th className="p-4 text-left">Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t, i) => (
                      <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                        <td className="p-4 text-zinc-400 text-xs">{t.time}</td>
                        <td className={`p-4 font-bold ${tradeColor(t.type)}`}>{t.type}</td>
                        <td className="p-4 font-bold">{t.symbol}</td>
                        <td className="p-4 text-right">₹ {t.price}</td>
                        <td className="p-4 text-right">{t.quantity}</td>
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

        {/* ======================== WATCHLIST ======================== */}
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
              <button
                onClick={addToWatchlist}
                className="bg-green-700 hover:bg-green-600 px-5 py-3 rounded-lg text-sm font-bold transition"
              >
                Add
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {watchlist.map((sym, i) => (
                <div key={i} className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex items-center justify-between">
                  <button
                    onClick={() => { setSymbol(sym); fetchStockData(sym); setActiveTab("dashboard"); }}
                    className="font-bold text-sm hover:text-green-400 transition text-left"
                  >
                    {sym}
                  </button>
                  <button
                    onClick={() => removeFromWatchlist(sym)}
                    className="text-zinc-600 hover:text-red-400 text-xs ml-2 transition"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-6 bg-zinc-900 border border-zinc-800 p-5 rounded-xl text-sm text-zinc-400">
              <p className="font-bold text-white mb-2">Symbol Format</p>
              <p>Indian stocks → add <code className="bg-zinc-800 px-1 rounded">.NS</code> suffix (e.g. <code className="bg-zinc-800 px-1 rounded">RELIANCE.NS</code>)</p>
              <p className="mt-1">US stocks → just the ticker (e.g. <code className="bg-zinc-800 px-1 rounded">AAPL</code>, <code className="bg-zinc-800 px-1 rounded">GOOGL</code>)</p>
              <p className="mt-1">Crypto → e.g. <code className="bg-zinc-800 px-1 rounded">BTC-USD</code>, <code className="bg-zinc-800 px-1 rounded">ETH-USD</code></p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
 
