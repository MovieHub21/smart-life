"use client";

import { useEffect, useMemo, useState } from "react";

type StatusItem = { code: string; value: unknown };
type Reading = { time: number; watts: number; voltage: number; current: number; energy: number };

function num(status: StatusItem[], codes: string[]) {
  const item = status.find(x => codes.includes(x.code));
  const n = Number(item?.value);
  return Number.isFinite(n) ? n : 0;
}

export default function Home() {
  const [status, setStatus] = useState<StatusItem[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Connecting…");
  const [rate, setRate] = useState(150);
  const [history, setHistory] = useState<Reading[]>([]);

  async function refresh() {
    try {
      const r = await fetch("/api/tuya/status", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Unable to read device");
      setStatus(data.status || []);
      setOnline(data.online ?? true);
      setMessage("Updated just now");
      const watts = num(data.status || [], ["cur_power", "power", "power_w", "cur_power_w"]);
      const voltage = num(data.status || [], ["cur_voltage", "voltage", "voltage_v"]);
      const current = num(data.status || [], ["cur_current", "current", "current_a"]);
      const energy = num(data.status || [], ["add_ele", "energy", "electricity", "total_energy"]);
      if (watts || voltage || current || energy) {
        setHistory(h => [...h.slice(-47), { time: Date.now(), watts, voltage, current, energy }]);
      }
    } catch (e) {
      setOnline(false);
      setMessage(e instanceof Error ? e.message : "Connection failed");
    }
  }

  async function toggle() {
    setBusy(true);
    try {
      const isOn = status.find(x => x.code === "switch_1" || x.code === "switch")?.value === true;
      const r = await fetch("/api/tuya/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: "switch_1", value: !isOn })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Command failed");
      await refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Command failed");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = Number(localStorage.getItem("energy_rate_ngn"));
    if (Number.isFinite(saved) && saved > 0) setRate(saved);
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, []);

  const watts = num(status, ["cur_power", "power", "power_w", "cur_power_w"]);
  const voltage = num(status, ["cur_voltage", "voltage", "voltage_v"]);
  const current = num(status, ["cur_current", "current", "current_a"]);
  const energy = num(status, ["add_ele", "energy", "electricity", "total_energy"]);
  const isOn = status.find(x => x.code === "switch_1" || x.code === "switch")?.value === true;
  const cost = useMemo(() => energy * rate, [energy, rate]);

  function saveRate(v: string) {
    const n = Math.max(0, Number(v) || 0);
    setRate(n);
    localStorage.setItem("energy_rate_ngn", String(n));
  }

  return (
    <main className="shell">
      <header className="top">
        <div>
          <p className="eyebrow">SCW1050 • TUYA</p>
          <h1>Power Monitor</h1>
          <p className="muted">{message}</p>
        </div>
        <div className={online ? "pill online" : "pill offline"}>● {online ? "Online" : "Offline"}</div>
      </header>

      <section className="hero card">
        <div>
          <p className="muted">Current power</p>
          <div className="power">{watts.toFixed(1)} <span>W</span></div>
          <p className="muted">Live reading from your smart plug</p>
        </div>
        <button className={isOn ? "powerBtn on" : "powerBtn"} onClick={toggle} disabled={busy || online === false}>
          {busy ? "…" : isOn ? "ON" : "OFF"}
        </button>
      </section>

      <section className="grid">
        <Metric label="Voltage" value={`${voltage.toFixed(1)} V`} />
        <Metric label="Current" value={`${current.toFixed(2)} A`} />
        <Metric label="Energy" value={`${energy.toFixed(2)} kWh`} />
        <Metric label="Est. cost" value={`₦${cost.toFixed(2)}`} />
      </section>

      <section className="card">
        <div className="sectionHead">
          <div><p className="eyebrow">ENERGY</p><h2>Recent readings</h2></div>
          <button className="secondary" onClick={refresh}>Refresh</button>
        </div>
        <div className="chart">
          {history.length === 0 ? <p className="muted">No readings yet. Once the Tuya connection is configured, readings will appear here.</p> :
            history.map((r, i) => <div key={i} className="barWrap" title={`${r.watts.toFixed(1)} W`}>
              <div className="bar" style={{height: `${Math.max(6, Math.min(100, r.watts / Math.max(...history.map(x => x.watts), 1) * 100))}%`}} />
            </div>)
          }
        </div>
      </section>

      <section className="card settings">
        <div>
          <p className="eyebrow">COST SETTINGS</p>
          <h2>Electricity rate</h2>
          <p className="muted">Used only to estimate your cost.</p>
        </div>
        <label>₦ / kWh<input type="number" min="0" step="0.01" value={rate} onChange={e => saveRate(e.target.value)} /></label>
      </section>

      <section className="card">
        <p className="eyebrow">RAW TUYA STATUS</p>
        <p className="muted small">This is intentionally visible while we identify the exact SCW1050 datapoints exposed by your device.</p>
        <pre>{status.length ? JSON.stringify(status, null, 2) : "No device status returned."}</pre>
      </section>
    </main>
  );
}

function Metric({label, value}: {label:string; value:string}) {
  return <div className="card metric"><p className="muted">{label}</p><strong>{value}</strong></div>;
}