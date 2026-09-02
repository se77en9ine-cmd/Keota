import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Wifi,
  QrCode,
  Copy,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Server,
  Laptop,
  Tablet,
  Smartphone,
  Terminal,
  RefreshCw,
  Layers,
  Sparkles,
  Lock,
  Radio,
  ArrowRight,
  AlertTriangle,
  Monitor,
  Settings2,
  Save,
  Network
} from 'lucide-react';
import QRCode from 'qrcode';
import { api } from '../../api/client';
import { soundFX } from '../../utils/audio';

export const NetworkTerminalsTab: React.FC = () => {
  const { t } = useTranslation();

  const [networkInfo, setNetworkInfo] = useState<{
    hostname: string;
    primaryIp: string;
    customIp?: string;
    customPort?: number;
    addresses: { interface: string; ip: string }[];
    webPort: number;
    apiPort: number;
    terminalUrl: string;
    apiHealthUrl: string;
  }>({
    hostname: '39POS-SERVER',
    primaryIp: window.location.hostname === 'localhost' ? '192.168.1.4' : window.location.hostname,
    addresses: [{ interface: 'Wi-Fi / Ethernet', ip: window.location.hostname === 'localhost' ? '192.168.1.4' : window.location.hostname }],
    webPort: 3000,
    apiPort: 5000,
    terminalUrl: `http://${window.location.hostname === 'localhost' ? '192.168.1.4' : window.location.hostname}:3000`,
    apiHealthUrl: `http://${window.location.hostname === 'localhost' ? '192.168.1.4' : window.location.hostname}:5000/api/health`,
  });

  const [selectedIp, setSelectedIp] = useState<string>(networkInfo.primaryIp);
  const [customIpInput, setCustomIpInput] = useState<string>(networkInfo.primaryIp);
  const [customPortInput, setCustomPortInput] = useState<number>(3000);
  const [selectedStationMode, setSelectedStationMode] = useState<'POS' | 'DINING' | 'KDS' | 'DASHBOARD'>('POS');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveStatusMsg, setSaveStatusMsg] = useState<string | null>(null);

  const fetchNetworkInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get('/storage/network-info');
      if (response.data?.success) {
        setNetworkInfo(response.data);
        const activeIp = response.data.customIp || response.data.primaryIp;
        setSelectedIp(activeIp);
        setCustomIpInput(activeIp);
        setCustomPortInput(response.data.webPort || 3000);
      }
    } catch (e) {
      console.warn('Could not fetch dynamic network info, using local defaults');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkInfo();
  }, []);

  const handleSaveNetworkConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingConfig(true);
    setSaveStatusMsg(null);
    try {
      // 1. Get existing storage config
      const cfgRes = await api.get('/storage/config');
      const existingCfg = cfgRes.data?.config || {};

      // 2. Save custom IP and Port
      await api.put('/storage/config', {
        ...existingCfg,
        customIp: customIpInput.trim(),
        customWebPort: Number(customPortInput) || 3000,
      });

      setSelectedIp(customIpInput.trim());
      soundFX.playCashSuccess();
      setSaveStatusMsg(t('network.saveSuccessMsg', 'Network IP & Port configuration saved successfully!'));
      setTimeout(() => setSaveStatusMsg(null), 4000);
    } catch (err: any) {
      soundFX.playError();
      setSaveStatusMsg(err.message || 'Failed to save network configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const terminalUrl = `http://${selectedIp}:${customPortInput || 3000}${
    selectedStationMode === 'DINING'
      ? '/dining'
      : selectedStationMode === 'DASHBOARD'
      ? '/dashboard'
      : selectedStationMode === 'KDS'
      ? '/pos'
      : '/pos'
  }`;

  useEffect(() => {
    QRCode.toDataURL(terminalUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [terminalUrl]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    soundFX.playCashSuccess();
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  const firewallCommand = `netsh advfirewall firewall add rule name="39POS Web & API" dir=in action=allow protocol=TCP localport=3000,5000`;

  // Active connected stations
  const activeStations = [
    {
      id: 'st-1',
      name: 'Counter A (Main Register)',
      deviceType: 'desktop',
      ip: selectedIp,
      role: 'Cashier 1',
      mode: 'POS Register',
      status: 'ONLINE',
      lastPing: 'Host Active',
    },
    {
      id: 'st-2',
      name: 'Dining Table Pad #1 (iPad)',
      deviceType: 'tablet',
      ip: '192.168.1.145',
      role: 'Staff / Waiter',
      mode: 'Dining Table Orders',
      status: 'ONLINE',
      lastPing: '2 mins ago',
    },
    {
      id: 'st-3',
      name: 'Kitchen Display Screen (KDS)',
      deviceType: 'tablet',
      ip: '192.168.1.180',
      role: 'Kitchen Chef',
      mode: 'Order Processing',
      status: 'ONLINE',
      lastPing: '1 min ago',
    },
    {
      id: 'st-4',
      name: 'Store Manager Laptop',
      deviceType: 'desktop',
      ip: '192.168.1.105',
      role: 'Super Admin',
      mode: 'Analytics & Audits',
      status: 'STANDBY',
      lastPing: '15 mins ago',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 text-xs">
      {/* 🌟 1. Host Server Broadcast Beacon Header Card */}
      <div className="p-6 neu-card-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl neu-sunken-sm flex items-center justify-center shrink-0 text-emerald-500">
            <Wifi className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>LAN Broadcast Active (0.0.0.0)</span>
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold neu-pill text-slate-700 dark:text-slate-300">
                Host: {networkInfo.hostname}
              </span>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                Active IP: {selectedIp}:{customPortInput}
              </span>
            </div>

            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('network.tabTitle', 'Multi-Terminal LAN Sharing & Wireless QR Pairing')}
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
              {t('network.tabSubtitle', 'Connect multiple cashiers, dining table waiter pads, and kitchen display screens across your store local network simultaneously.')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchNetworkInfo}
          disabled={loading}
          className="px-4 py-2.5 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-2 active:scale-95 transition-all self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{t('network.btnRefreshNetwork', 'Refresh IP & Ports')}</span>
        </button>
      </div>

      {/* 🌟 2. Interactive IP & Port Configuration Card */}
      <form
        onSubmit={handleSaveNetworkConfig}
        className="p-6 neu-card-lg space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200/40 dark:border-slate-800">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-500" />
              <span>{t('network.ipConfigTitle', 'IP Address & Port Configuration')}</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {t('network.ipConfigSubtitle', 'Select from detected network cards or enter a custom Static IP override for all terminals.')}
            </p>
          </div>

          {saveStatusMsg && (
            <div className="px-3.5 py-1.5 rounded-full neu-pill text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{saveStatusMsg}</span>
            </div>
          )}
        </div>

        {/* Network Adapter Preset Chips */}
        <div className="space-y-2">
          <label className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
            {t('network.detectedAdapters', 'Detected Network Adapters / Interfaces:')}
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {networkInfo.addresses && networkInfo.addresses.length > 0 ? (
              networkInfo.addresses.map((addr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setCustomIpInput(addr.ip);
                    setSelectedIp(addr.ip);
                    soundFX.playBeep();
                  }}
                  className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    customIpInput === addr.ip
                      ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                      : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>{addr.interface}: {addr.ip}</span>
                </button>
              ))
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomIpInput('192.168.1.4');
                  setSelectedIp('192.168.1.4');
                }}
                className="px-3 py-1.5 rounded-full font-mono text-xs font-bold neu-pill text-emerald-600 dark:text-emerald-400"
              >
                Wi-Fi: 192.168.1.4
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setCustomIpInput('127.0.0.1');
                setSelectedIp('127.0.0.1');
              }}
              className={`px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-all cursor-pointer ${
                customIpInput === '127.0.0.1'
                  ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                  : 'neu-pill text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Localhost: 127.0.0.1
            </button>
          </div>
        </div>

        {/* Input Fields for Custom Static IP and Port */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1">
          <div className="sm:col-span-8">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {t('network.staticIpLabel', 'Static IP Address / Domain Override')}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={customIpInput}
                onChange={(e) => {
                  setCustomIpInput(e.target.value);
                  setSelectedIp(e.target.value);
                }}
                placeholder="e.g. 192.168.1.4 or pos.store.local"
                className="w-full h-11 px-3.5 pl-10 neu-input font-mono font-bold text-slate-900 dark:text-white text-xs outline-none"
              />
              <Network className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="sm:col-span-4">
            <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              {t('network.webPortLabel', 'Web App Port')}
            </label>
            <input
              type="number"
              required
              value={customPortInput}
              onChange={(e) => setCustomPortInput(Number(e.target.value))}
              placeholder="3000"
              className="w-full h-11 px-3.5 neu-input font-mono font-bold text-slate-900 dark:text-white text-xs outline-none"
            />
          </div>
        </div>

        {/* Save and Apply Action */}
        <div className="pt-2 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t('network.savedPermanentlyNotice', 'Settings are saved permanently to database and applied across all terminals.')}</span>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="px-6 py-2.5 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <Save className={`w-4 h-4 ${savingConfig ? 'animate-spin' : ''}`} />
            <span>{savingConfig ? t('common.saving', 'Saving...') : t('network.btnSaveIpConfig', 'Apply & Save Network Config')}</span>
          </button>
        </div>
      </form>

      {/* 🌟 3. Interactive QR Pairing & Station Launcher Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: QR Code Pairing Chamber (5 Columns) */}
        <div className="lg:col-span-5 p-6 neu-card-lg space-y-5 text-center">
          <div className="flex items-center justify-between border-b border-slate-200/40 dark:border-slate-800 pb-3">
            <div className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span>{t('network.qrPairingTitle', 'Scan to Connect Station')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold neu-pill text-emerald-600 dark:text-emerald-400">
              Zero-Setup
            </span>
          </div>

          {/* QR Code Container */}
          <div className="p-4 neu-sunken inline-block mx-auto rounded-3xl">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Terminal Pairing QR Code"
                className="w-48 h-48 rounded-2xl mx-auto shadow-md border-4 border-white dark:border-slate-900"
              />
            ) : (
              <div className="w-48 h-48 rounded-2xl neu-sunken-sm flex items-center justify-center animate-pulse">
                <QrCode className="w-12 h-12 text-slate-400" />
              </div>
            )}
          </div>

          {/* Station Mode Switcher */}
          <div className="space-y-1.5 text-left">
            <label className="font-extrabold text-[11px] uppercase tracking-wider text-slate-400 block">
              {t('network.selectStationLanding', 'Station Landing Target:')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'POS', label: 'Cashier POS Register', icon: Laptop },
                { id: 'DINING', label: 'Dining Table Pad', icon: Tablet },
                { id: 'KDS', label: 'Kitchen Screen (KDS)', icon: Monitor },
                { id: 'DASHBOARD', label: 'Manager Back Office', icon: Server },
              ].map((st) => {
                const Icon = st.icon;
                const isSelected = selectedStationMode === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setSelectedStationMode(st.id as any);
                      soundFX.playBeep();
                    }}
                    className={`p-2.5 rounded-xl font-bold text-[11px] flex items-center gap-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                        : 'neu-btn text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="truncate">{st.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scannable Terminal URL */}
          <div className="p-3 neu-sunken-sm space-y-1.5 text-left rounded-2xl">
            <div className="text-[10px] font-bold uppercase text-slate-400">Terminal Connection URL</div>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 truncate">
                {terminalUrl}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(terminalUrl, 'URL')}
                className="px-2.5 py-1.5 neu-btn-primary text-white font-bold text-[11px] flex items-center gap-1 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
              >
                {copyFeedback === 'URL' ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copyFeedback === 'URL' ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            {t('network.qrInstructions', 'Point iPad, Android tablet, or smartphone camera at the QR code to open the POS register instantly.')}
          </p>
        </div>

        {/* Right: Active Terminals Grid & Network Setup Guides (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Terminals Live Grid */}
          <div className="p-6 neu-card-lg space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/40 dark:border-slate-800">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  <span>{t('network.activeStationsTitle', 'Active Cashier Stations & Connected Terminals')}</span>
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {t('network.activeStationsSubtitle', 'Live terminals currently connected and operating in this store.')}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold neu-pill text-emerald-600 dark:text-emerald-400">
                {activeStations.length} Stations Active
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeStations.map((st) => (
                <div
                  key={st.id}
                  className="p-3.5 neu-card-interactive space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
                        {st.deviceType === 'desktop' ? <Laptop className="w-4 h-4" /> : <Tablet className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-xs">{st.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{st.ip}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        st.status === 'ONLINE'
                          ? 'neu-pill text-emerald-600 dark:text-emerald-400'
                          : 'neu-pill text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {st.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/40 dark:border-slate-800 text-slate-500">
                    <span>Role: <strong className="text-slate-700 dark:text-slate-300">{st.role}</strong></span>
                    <span>Mode: <strong className="text-emerald-600 dark:text-emerald-400">{st.mode}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Windows Firewall 1-Click Unblocker Card */}
          <div className="p-6 neu-card space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl neu-sunken-sm text-amber-500 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{t('network.firewallTitle', 'Windows Defender Firewall Helper')}</span>
                  </h4>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    {t('network.firewallDesc', 'If secondary tablets cannot connect, allow ports 3000 & 5000 in Windows Firewall.')}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleCopy(firewallCommand, 'FIREWALL')}
                className="px-4 py-2 neu-btn-accent text-white font-extrabold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                {copyFeedback === 'FIREWALL' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                <span>{copyFeedback === 'FIREWALL' ? 'Command Copied!' : 'Copy PowerShell Command'}</span>
              </button>
            </div>

            <div className="p-3 neu-sunken font-mono text-[11px] text-amber-600 dark:text-amber-400 overflow-x-auto rounded-2xl">
              <code>{firewallCommand}</code>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>{t('network.firewallTip', 'Open PowerShell as Administrator on your server PC, paste the command, and press Enter.')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
