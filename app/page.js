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
} from "chart.js";

import { Line } from "react-chartjs-2";

import {
  CandlestickController,
  CandlestickElement
} from "chartjs-chart-financial";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);



export default function Home() {

  const [portfolio, setPortfolio] = useState({
    cash: 0,
    stocks: {},
    total_portfolio_value: 0,
  });

  const [symbol, setSymbol] = useState("");

  const [stockData, setStockData] = useState(null);

  const [candleData, setCandleData] = useState(null);

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  // --------------------------------
  // Fetch Portfolio
  // --------------------------------

  const fetchPortfolio = async () => {

    try {

      const res = await axios.get(
        "http://127.0.0.1:8000/portfolio/value"
      );

      setPortfolio(res.data);

    } catch (error) {

      console.error("Portfolio Error:", error);

    }
  };

  // --------------------------------
  // Fetch Stock
  // --------------------------------

  const fetchStockData = async () => {

    if (!symbol) return;

    try {

      const res = await axios.get(
        `http://127.0.0.1:8000/stock/${symbol}`
      );

      setStockData(res.data);

      fetchChartData();

      fetchCandles();

    } catch (error) {

      console.error("Stock Error:", error);

    }
  };

  // --------------------------------
  // Fetch Chart
  // --------------------------------

  const fetchChartData = async () => {

    if (!symbol) return;

    try {

      const res = await axios.get(
        `http://127.0.0.1:8000/history/${symbol}`
      );

      setChartData({
        labels: res.data.dates,
        datasets: [
          {
            label: symbol,
            data: res.data.prices,
            borderColor: "#22c55e",
            backgroundColor: "rgba(34,197,94,0.2)",
            tension: 0.4,
          },
        ],
      });

    } catch (error) {

      console.error("Chart Error:", error);

    }
  };


  const fetchCandles = async () => {

  if (!symbol) return;

  try {

    const res = await axios.get(
      `http://127.0.0.1:8000/candles/${symbol}`
    );

    setCandleData({
      datasets: [
        {
          label: symbol,
          data: res.data,
        },
      ],
    });

  } catch (error) {

    console.error("Candle Error:", error);

  }
};

  // --------------------------------
  // Buy Stock
  // --------------------------------

  const buyStock = async () => {

    if (!symbol) return;

    try {

      await axios.post(
        `http://127.0.0.1:8000/buy/${symbol}?quantity=1`
      );

      fetchPortfolio();

      fetchStockData();

    } catch (error) {

      console.error("Buy Error:", error);

    }
  };

  // --------------------------------
  // Sell Stock
  // --------------------------------

  const sellStock = async () => {

    if (!symbol) return;

    try {

      await axios.post(
        `http://127.0.0.1:8000/sell/${symbol}?quantity=1`
      );

      fetchPortfolio();

      fetchStockData();

    } catch (error) {

      console.error("Sell Error:", error);

    }
  };

  // --------------------------------
  // Auto Refresh
  // --------------------------------

  useEffect(() => {

    fetchPortfolio();

    const interval = setInterval(() => {

      fetchPortfolio();

    }, 5000);

    return () => clearInterval(interval);

  }, []);

  return (

    <div className="min-h-screen bg-black text-white p-10">

      {/* Header */}

      <h1 className="text-5xl font-bold mb-10 text-green-400">
        AI Trading Dashboard
      </h1>

      {/* Search */}

      <div className="flex gap-4 mb-10">

        <input
          className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl w-80 text-white outline-none"
          placeholder="Enter stock symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />

        <button
          onClick={fetchStockData}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-xl"
        >
          Search
        </button>

        <button
          onClick={buyStock}
          className="bg-green-600 hover:bg-green-700 px-6 py-4 rounded-xl"
        >
          Buy
        </button>

        <button
          onClick={sellStock}
          className="bg-red-600 hover:bg-red-700 px-6 py-4 rounded-xl"
        >
          Sell
        </button>

      </div>

      {/* Stock Data */}

      {

        stockData && (

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg mb-10">

            <h2 className="text-3xl font-bold mb-6 text-white">
              Stock Analysis
            </h2>

            <div className="grid grid-cols-2 gap-6">

              <div>
                <p className="text-zinc-400">Current Price</p>
                <p className="text-2xl font-bold text-green-400">
                  ₹ {stockData.current_price}
                </p>
              </div>

              <div>
                <p className="text-zinc-400">RSI</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {stockData.RSI}
                </p>
              </div>

              <div>
                <p className="text-zinc-400">SMA20</p>
                <p className="text-2xl font-bold text-blue-400">
                  {stockData.SMA20}
                </p>
              </div>

              <div>
                <p className="text-zinc-400">SMA50</p>
                <p className="text-2xl font-bold text-purple-400">
                  {stockData.SMA50}
                </p>
              </div>

            </div>

            <div className="mt-6">

              <p className="text-zinc-400 mb-2">
                AI Signal
              </p>

              <div className="inline-block bg-green-600 px-5 py-3 rounded-xl text-xl font-bold">
                {stockData.AI_signal}
              </div>

            </div>

          </div>

        )

      }


      {/* Candlestick Chart */}

{
  candleData && (

    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg mb-10">

      <h2 className="text-3xl font-bold mb-6">
        Candlestick Chart
      </h2>

      <Line
        data={candleData}
        options={{
          responsive: true,
        }}
      />

    </div>

  )
}

      {/* Chart */}

      {

        chartData.labels.length > 0 && (

          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg mb-10">

            <h2 className="text-3xl font-bold mb-6">
              Live Stock Chart
            </h2>

            <Line data={chartData} />

          </div>

        )

      }

      {/* Portfolio */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">

          <h2 className="text-2xl font-bold mb-3 text-zinc-400">
            Cash Balance
          </h2>

          <p className="text-4xl font-bold text-green-400">
            ₹ {portfolio.cash}
          </p>

        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">

          <h2 className="text-2xl font-bold mb-3 text-zinc-400">
            Portfolio Value
          </h2>

          <p className="text-4xl font-bold text-blue-400">
            ₹ {portfolio.total_portfolio_value}
          </p>

        </div>

      </div>

      {/* Holdings */}

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-lg">

        <h2 className="text-3xl font-bold mb-6">
          Holdings
        </h2>

        {

          Object.entries(portfolio.stocks).length > 0 ? (

            Object.entries(portfolio.stocks).map(([symbol, value]) => (

              <div
                key={symbol}
                className="border-b border-zinc-800 py-4 flex justify-between"
              >

                <p className="text-xl font-bold">
                  {symbol}
                </p>

                <p className="text-green-400 text-xl">
                  ₹ {value}
                </p>

              </div>

            ))

          ) : (

            <p className="text-zinc-500">
              No holdings
            </p>

          )

        }

      </div>

    </div>

  );
}