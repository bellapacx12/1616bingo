import React, { useEffect, useState } from "react";

export default function ModalReport({ show, onClose, shopId }) {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(null); // 👈 Add this
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (show && shopId) {
      setLoading(true);
      setError(null);
      fetch(`https://one616api.onrender.com/report/${shopId}`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch reports");
          return res.json();
        })
        .then((data) => {
          setReportData(Array.isArray(data.games) ? data.games : []);
          setBalance(data.balance ?? null); // 👈 Set balance
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [show, shopId]);

  if (!show) return null;

  // Filter logic for date range
  const filteredData = Array.isArray(reportData)
    ? reportData.filter((row) => {
        const rowDate =
          row.date || (row.started_at ? row.started_at.slice(0, 10) : "");
        if (dateFrom && rowDate < dateFrom) return false;
        if (dateTo && rowDate > dateTo) return false;
        return true;
      })
    : [];

  // Calculate total commission amount
  const totalCommission = filteredData.reduce(
    (sum, row) => sum + (Number(row.commission_amount) || 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Neon Game Background */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="relative w-full max-w-4xl mx-4 p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 via-fuchsia-600 to-purple-700 shadow-[0_0_40px_rgba(0,255,255,0.25)]">
        <div className="relative bg-[#05070d]/95 rounded-2xl border border-cyan-400/20 backdrop-blur-xl p-8">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-5 text-cyan-300 text-3xl font-bold hover:text-red-400 transition"
          >
            &times;
          </button>

          {/* Title */}
          <h2 className="text-3xl font-extrabold mb-6 text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(0,255,255,0.6)]">
            REPORT
          </h2>

          {/* Balance */}
          <div className="text-lg font-bold text-cyan-200 bg-cyan-500/10 border border-cyan-400/20 px-4 py-3 rounded-xl mb-5 shadow-inner">
            Balance:
            <span className="ml-2 text-green-400 text-xl">
              {balance !== null
                ? balance.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })
                : "Loading..."}
            </span>
          </div>

          {/* Filters */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <label className="text-cyan-300 font-semibold">Date from:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0a0f1f] border border-cyan-400/30 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />

            <label className="text-cyan-300 font-semibold">to</label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0a0f1f] border border-cyan-400/30 text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />

            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="ml-2 px-3 py-1 rounded-lg bg-red-600/80 text-white text-xs font-bold hover:bg-red-600 transition"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-8 text-cyan-300 font-semibold">
                Loading Reports...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-400 font-semibold">
                {error}
              </div>
            ) : (
              <>
                <div className="max-h-[400px] overflow-y-auto rounded-xl border border-cyan-400/20">
                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-[#0a0f1f] border-b border-cyan-400/20">
                      <tr className="text-cyan-300">
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Game ID</th>
                        <th className="px-4 py-3">Prize</th>
                        <th className="px-4 py-3">Cards</th>
                        <th className="px-4 py-3">Commission</th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.isArray(filteredData) &&
                      filteredData.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="text-center py-6 text-cyan-400/70"
                          >
                            No reports found.
                          </td>
                        </tr>
                      ) : (
                        Array.isArray(filteredData) &&
                        filteredData.map((row, idx) => (
                          <tr
                            key={row.id || row.round_id || idx}
                            className="border-b border-cyan-400/10 hover:bg-cyan-500/5 text-cyan-200"
                          >
                            <td className="px-4 py-2 text-center">{idx + 1}</td>
                            <td className="px-4 py-2 text-center">
                              {row.date || row.started_at?.slice(0, 10) || "-"}
                            </td>
                            <td className="px-4 py-2 text-center font-mono text-xs text-purple-300">
                              {row.gameId || row.round_id || "-"}
                            </td>
                            <td className="px-4 py-2 text-center text-green-400 font-bold">
                              {row.prize || "-"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {row.selected_cards?.length || "-"}
                            </td>
                            <td className="px-4 py-2 text-center">
                              {row.commission_amount || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Total Commission Bar */}
                <div className="mt-4">
                  <div className="flex justify-end items-center bg-[#0a0f1f] border border-cyan-400/20 rounded-xl px-6 py-4 shadow-[0_0_20px_rgba(0,255,255,0.15)]">
                    <span className="text-lg font-bold text-cyan-300 mr-4">
                      TOTAL COMMISSION:
                    </span>
                    <span className="text-2xl font-extrabold text-green-400">
                      {totalCommission.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
