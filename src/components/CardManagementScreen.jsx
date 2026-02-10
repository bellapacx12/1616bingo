import React, { useState, useEffect } from "react";
import ModalReport from "./ModalReport";
import CardModal from "./showCard";

const TOTAL_CARDS = 400;
const DEFAULT_COLOR = "#3B82F6"; // blue shade

export default function CardManagementScreen({
  selectedCards,
  setCurrentView,
}) {
  const [selectedCardState, setSelectedCardState] = useState([]);
  const [cardColor, setCardColor] = useState(DEFAULT_COLOR);
  const [bet, setBet] = useState(10);
  const [commission, setCommission] = useState("20%");
  const [interval, setInterval] = useState("12 sec");
  const [pattern, setPattern] = useState("All");
  const [language, setLanguage] = useState("Amharic");
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blurred, setBlurred] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState(null);

  // Initialize local selected cards state from prop if present
  useEffect(() => {
    if (selectedCards && selectedCards.length > 0) {
      setSelectedCardState(selectedCards);
    }
  }, [selectedCards]);

  // Fetch balance on mount
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const shop_id = localStorage.getItem("shopid");
        const balanceRes = await fetch(
          `https://one616api.onrender.com/balance/${shop_id}`,
        );
        if (!balanceRes.ok) throw new Error("Failed to fetch balance");
        const { balance } = await balanceRes.json();
        setBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        alert("❌ Unable to load balance.");
      }
    };
    fetchBalance();
  }, []);

  // Logout handler
  const handleLogout = () => {
    localStorage.clear();
    setCurrentView({ name: "login" });
  };

  // Toggle card selection
  const toggleCard = (num) => {
    setSelectedCardState((prev) => {
      const isAlreadySelected = prev.includes(num);
      if (!isAlreadySelected) {
        setSelectedCardId(num); // Open modal for this card
        // setIsModalOpen(true); // Uncomment if you want modal to open on select
        return [...prev, num];
      } else {
        return prev.filter((n) => n !== num);
      }
    });
  };

  // Close card modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCardId(null);
  };

  // Calculate prize based on bet, commission, and selected cards
  const calculatePrize = () => {
    const numSelectedCards = selectedCardState.length;
    const betAmount = bet;
    const commissionRate = parseFloat(commission) / 100;

    if (numSelectedCards === 0 || betAmount <= 0) {
      return 0;
    }

    const totalBet = numSelectedCards * betAmount;
    return totalBet * (1 - commissionRate);
  };

  // Start the game
  const startGame = async () => {
    setIsLoading(true);
    const prize = calculatePrize();
    const parsedInterval = parseInt(interval.split(" ")[0]) * 1000;

    try {
      const shopId = localStorage.getItem("shopid");

      const res = await fetch("https://one616api.onrender.com/startgame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop_id: shopId,
          bet_per_card: bet,
          commission_rate: parseFloat(commission) / 100,
          interval: parsedInterval,
          language: language,
          winning_pattern: pattern,
          prize: prize,
          total_cards: selectedCardState.length,
          selected_cards: selectedCardState,
        }),
      });

      if (!res.ok) throw new Error("Game creation failed");
      const { round_id } = await res.json();

      setCurrentView({
        name: "dashboard",
        props: {
          roundId: round_id,
          shopId,
          prize,
          selectedCards: selectedCardState,
          interval: parsedInterval,
          language,
          betPerCard: bet,
          commissionRate: parseFloat(commission) / 100,
          winningPattern: pattern,
        },
      });
    } catch (err) {
      console.error("Start Game Error:", err);
      alert("❌ Failed to start game. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shopId = localStorage.getItem("shopid");

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      {/* Sidebar Settings Panel */}
      <aside className="w-72 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-6 shadow-xl">
        <div className="pb-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-300">
            Selected Cards
          </h2>
          <p className="text-4xl font-bold text-emerald-400">
            {selectedCardState.length}
          </p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4">
          <label className="block text-sm font-medium mb-1 text-slate-300">
            Bet Per Card (ETB)
          </label>
          <input
            type="number"
            value={bet}
            onChange={(e) => setBet(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div
          className={`flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-800/60 backdrop-blur ${
            !blurred ? "blur-sm" : ""
          }`}
        >
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1 text-slate-300">
              Commission
            </label>
            <select
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
            >
              <option>20%</option>
              <option>30%</option>
            </select>
          </div>
          <button
            onClick={() => setBlurred(!blurred)}
            className="px-3 py-2 text-sm rounded-md bg-cyan-500 hover:bg-cyan-400 text-black font-medium"
          >
            {blurred ? "Unblur" : "Blur"}
          </button>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4">
          <label className="block text-sm font-medium mb-1 text-slate-300">
            Call Interval
          </label>
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
          >
            <option>7 sec</option>
            <option>9 sec</option>
            <option>12 sec</option>
            <option>15 sec</option>
            <option>17 sec</option>
          </select>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4">
          <label className="block text-sm font-medium mb-1 text-slate-300">
            Winning Pattern
          </label>
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
          >
            <option>All</option>
            <option>1 Line</option>
            <option>2 Lines</option>
            <option>Four Corners</option>
            <option>Cross</option>
            <option>Inner Corners + Center</option>
            <option>Full House</option>
          </select>
        </div>

        <div className="bg-slate-800/60 backdrop-blur rounded-xl p-4">
          <label className="block text-sm font-medium mb-1 text-slate-300">
            Language
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-slate-700 bg-slate-900"
          >
            <option>Amharic</option>
            <option>English</option>
          </select>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            1616 Bingo
          </h1>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              className="px-5 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
              onClick={() => setShowReportModal(true)}
            >
              Reports
            </button>

            <button
              onClick={startGame}
              disabled={selectedCardState.length === 0}
              className={`px-6 py-2.5 rounded-md font-semibold text-white shadow-lg transition min-w-[150px] ${
                selectedCardState.length === 0
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 shadow-emerald-500/30"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Starting...
                </div>
              ) : (
                "Start Bingo Game"
              )}
            </button>

            <button
              onClick={handleLogout}
              className="px-5 py-2.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        <div className="grid grid-cols-10 md:grid-cols-12 lg:grid-cols-14 xl:grid-cols-16 gap-3">
          {Array.from({ length: TOTAL_CARDS }, (_, i) => i + 1).map((num) => {
            const isSelected = selectedCardState.includes(num);
            return (
              <button
                key={num}
                onClick={() => toggleCard(num)}
                className={`w-12 h-12 md:w-14 md:h-14 rounded-lg flex items-center justify-center font-mono font-bold transition-all border ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-400 ring-2 ring-emerald-400 scale-105 shadow-lg shadow-emerald-500/20"
                    : "bg-slate-800 border-slate-700 hover:bg-slate-700 hover:scale-105"
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>
      </main>

      {/* Modals */}
      <ModalReport
        show={showReportModal}
        onClose={() => setShowReportModal(false)}
        shopId={shopId}
      />

      <CardModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        winningCardIds={selectedCardId ? [selectedCardId] : []}
      />
    </div>
  );
}
