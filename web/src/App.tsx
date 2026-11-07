import { useEffect, useMemo, useState } from "react";
import {
  createPublicClient,
  formatUnits,
  http,
  isAddress,
  type Address,
} from "viem";
import { celo } from "viem/chains";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Languages,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import logo from "../assets/images/peso-rachar-logo.png";


declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initDataUnsafe?: { user?: { id?: number; first_name?: string } };
      };
    };
  }
}

const TOKENS = {
  wARS: {
    address: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d",
    decimals: 18,
    fiat: "ARS",
    country: "AR",
    label: "Argentine Peso",
  },
  wBRL: {
    address: "0xd76f5faf6888e24d9f04bf92a0c8b921fe4390e0",
    decimals: 18,
    fiat: "BRL",
    country: "BR",
    label: "Brazilian Real",
  },
  wCOP: {
    address: "0x8a1d45e102e886510e891d2ec656a708991e2d76",
    decimals: 18,
    fiat: "COP",
    country: "CO",
    label: "Colombian Peso",
  },
} as const;
type Token = keyof typeof TOKENS;
type Lang = "en" | "es" | "pt";
const translations: Record<Lang, Record<string, string>> = {
  en: {
    title: "PesoRachar",
    subtitle: "Group payments, without the back-and-forth.",
    total: "Your stablecoin wallet",
    available: "Available balances",
    deposit: "Deposit cash",
    send: "Send",
    activity: "Recent activity",
    noActivity: "Your transactions will appear here.",
    wallet: "Celo wallet address",
    walletHint: "Enter your 0x wallet address to load balances.",
    refresh: "Refresh balances",
    choose: "Choose local currency",
    amount: "Amount in local currency",
    continue: "Continue to Ripio",
    secure: "Non-custodial wallet connection",
    note: "Deposits are completed on Ripio. KYC and payment methods depend on your country.",
    invalid: "Enter a valid Celo wallet address.",
    loading: "Loading balances…",
    error: "Could not load balances. Check the RPC connection.",
    copied: "Address copied",
    language: "Language",
    powered: "Built on Celo",
  },
  es: {
    title: "PesoRachar",
    subtitle: "Pagos grupales, sin complicaciones.",
    total: "Tu billetera de stablecoins",
    available: "Saldos disponibles",
    deposit: "Depositar efectivo",
    send: "Enviar",
    activity: "Actividad reciente",
    noActivity: "Tus transacciones aparecerán aquí.",
    wallet: "Dirección de billetera Celo",
    walletHint: "Ingresa tu dirección 0x para consultar saldos.",
    refresh: "Actualizar saldos",
    choose: "Elige moneda local",
    amount: "Monto en moneda local",
    continue: "Continuar a Ripio",
    secure: "Conexión de billetera no custodial",
    note: "Los depósitos se completan en Ripio. KYC y medios de pago dependen de tu país.",
    invalid: "Ingresa una dirección Celo válida.",
    loading: "Cargando saldos…",
    error: "No se pudieron cargar los saldos. Revisa la conexión RPC.",
    copied: "Dirección copiada",
    language: "Idioma",
    powered: "Desarrollado en Celo",
  },
  pt: {
    title: "PesoRachar",
    subtitle: "Pagamentos em grupo, sem complicação.",
    total: "Sua carteira de stablecoins",
    available: "Saldos disponíveis",
    deposit: "Depositar dinheiro",
    send: "Enviar",
    activity: "Atividade recente",
    noActivity: "Suas transações aparecerão aqui.",
    wallet: "Endereço da carteira Celo",
    walletHint: "Informe seu endereço 0x para consultar saldos.",
    refresh: "Atualizar saldos",
    choose: "Escolha a moeda local",
    amount: "Valor na moeda local",
    continue: "Continuar para Ripio",
    secure: "Conexão de carteira não custodial",
    note: "Os depósitos são concluídos na Ripio. KYC e meios de pagamento variam por país.",
    invalid: "Informe um endereço Celo válido.",
    loading: "Carregando saldos…",
    error: "Não foi possível carregar os saldos. Verifique o RPC.",
    copied: "Endereço copiado",
    language: "Idioma",
    powered: "Desenvolvido na Celo",
  },
};
const erc20Abi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const client = createPublicClient({
  chain: celo,
  transport: http(
    import.meta.env.VITE_CELO_RPC_URL || "https://forno.celo.org",
  ),
});

export default function App() {
  const [lang, setLang] = useState<Lang>("en");
  const [wallet, setWallet] = useState("");
  const [balances, setBalances] = useState<Record<Token, string>>({
    wARS: "—",
    wBRL: "—",
    wCOP: "—",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<Token>("wARS");
  const [amount, setAmount] = useState("10000");
  const [showDeposit, setShowDeposit] = useState(false);
  const t = translations[lang];

  useEffect(() => {
    window.Telegram?.WebApp?.ready();
    window.Telegram?.WebApp?.expand();
    const params = new URLSearchParams(window.location.search);
    const queryWallet = params.get("address");
    if (queryWallet && isAddress(queryWallet)) setWallet(queryWallet);
  }, []);

  const totalLabel = useMemo(() => {
    const fiat = TOKENS[token].fiat;
    return `${fiat} · ${TOKENS[token].label}`;
  }, [token]);

  async function loadBalances() {
    setError("");
    if (!isAddress(wallet)) {
      setError(t.invalid);
      return;
    }
    setLoading(true);
    try {
      const entries = await Promise.all(
        (Object.keys(TOKENS) as Token[]).map(async (key) => {
          const raw = await client.readContract({
            address: TOKENS[key].address as Address,
            abi: erc20Abi,
            functionName: "balanceOf",
            args: [wallet as Address],
          });
          return [
            key,
            Number(formatUnits(raw, TOKENS[key].decimals)).toLocaleString(
              undefined,
              { maximumFractionDigits: 4 },
            ),
          ] as const;
        }),
      );
      setBalances(Object.fromEntries(entries) as Record<Token, string>);
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  function openRipio() {
    if (!isAddress(wallet)) {
      setError(t.invalid);
      return;
    }
    const base =
      import.meta.env.VITE_RIPIO_RAMP_BASE || "https://ramp.ripio.com/";
    const url = new URL(base);
    url.searchParams.set("country", TOKENS[token].country);
    url.searchParams.set("chain", "42220");
    url.searchParams.set("token", token.toUpperCase());
    url.searchParams.set("amount", amount);
    url.searchParams.set("address", wallet);
    window.open(url.toString(), "_blank", "noopener,noreferrer");
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-5 sm:pt-8">
      <header className="mb-7 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl ">
            <img classname="brand-logo" src={logo} alt="" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight">{t.title}</h1>
            <p className="text-xs text-[#718078]">{t.powered} · Mainnet</p>
          </div>
        </div>
        <label className="flex items-center gap-1.5 rounded-full border border-[#e5e9e2] bg-white px-3 py-2 text-xs font-semibold">
          <Languages size={14} />
          <span className="sr-only">{t.language}</span>
          <select
            aria-label={t.language}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="max-w-[88px] bg-transparent outline-none"
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt">Português</option>
          </select>
        </label>
      </header>

      <section className="rounded-[28px] bg-[#173c2d] p-5 text-white shadow-[0_16px_40px_rgba(23,60,45,.13)]">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm text-white/70">{t.total}</span>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-[#d5f46b]">
            CELO · 42220
          </span>
        </div>
        <div className="mb-2 flex items-center gap-2 text-sm text-white/65">
          <Wallet size={16} /> {t.available}
        </div>
        <div className="space-y-3">
          {(Object.keys(TOKENS) as Token[]).map((key) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-2xl bg-white/[0.07] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d5f46b] text-xs font-black text-[#173c2d]">
                  {key.slice(1)}
                </div>
                <div>
                  <p className="font-bold">{key}</p>
                  <p className="text-[11px] text-white/55">
                    {TOKENS[key].label}
                  </p>
                </div>
              </div>
              <p className="text-right text-lg font-bold tabular-nums">
                {balances[key]}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value.trim())}
            placeholder="0x…"
            aria-label={t.wallet}
            className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-xs text-white outline-none placeholder:text-white/40 focus:border-[#d5f46b]"
          />
          <p className="mt-2 text-[11px] text-white/55">{t.walletHint}</p>
          <button
            onClick={loadBalances}
            disabled={loading}
            className="mt-3 w-full rounded-xl bg-[#d5f46b] px-4 py-3 text-sm font-extrabold text-[#173c2d] transition hover:bg-[#e2ff87] disabled:opacity-60"
          >
            {loading ? t.loading : t.refresh}
          </button>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700"
        >
          {error}
        </p>
      )}

      <section className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowDeposit(true)}
          className="flex items-center justify-center gap-2 rounded-2xl bg-[#d5f46b] px-4 py-4 text-sm font-extrabold text-[#173c2d] shadow-sm"
        >
          <ArrowDownLeft size={18} /> {t.deposit}
        </button>
        <button
          onClick={() => {
            const botUrl =
              "https://t.me/" +
              (import.meta.env.VITE_TELEGRAM_BOT_USERNAME ||
                "YOUR_BOT_USERNAME");
            window.open(botUrl, "_blank", "noopener,noreferrer");
          }}
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#e3e8e1] bg-white px-4 py-4 text-sm font-bold text-[#173c2d]"
        >
          <ArrowUpRight size={18} /> {t.send}
        </button>
      </section>

      <section className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">{t.activity}</h2>
          <span className="text-xs text-[#8a958e]">Celo</span>
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-[#e8ece6] bg-white p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f1f5ed] text-[#648071]">
            <CircleHelp size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">{t.noActivity}</p>
            <p className="mt-1 text-xs text-[#89948d]">
              Transaction history integration pending
            </p>
          </div>
        </div>
      </section>

      <footer className="mt-7 flex items-center justify-center gap-2 text-[11px] text-[#87928b]">
        <ShieldCheck size={14} /> {t.secure}
      </footer>

      {showDeposit && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 p-3 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="deposit-title"
            className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="deposit-title" className="text-lg font-extrabold">
                {t.deposit}
              </h2>
              <button
                onClick={() => setShowDeposit(false)}
                className="rounded-full bg-[#f1f4ef] px-3 py-1 text-sm"
              >
                ✕
              </button>
            </div>
            <label className="mb-2 block text-xs font-bold text-[#66736b]">
              {t.choose}
            </label>
            <div className="relative mb-4">
              <select
                value={token}
                onChange={(e) => setToken(e.target.value as Token)}
                className="w-full appearance-none rounded-xl border border-[#e2e8e1] bg-white px-3 py-3 text-sm font-semibold outline-none"
              >
                {(Object.keys(TOKENS) as Token[]).map((key) => (
                  <option key={key} value={key}>
                    {key} — {TOKENS[key].label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-3.5 text-[#7c8981]"
                size={17}
              />
            </div>
            <p className="mb-2 text-xs text-[#66736b]">{totalLabel}</p>
            <label className="mb-2 block text-xs font-bold text-[#66736b]">
              {t.amount}
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              className="mb-4 w-full rounded-xl border border-[#e2e8e1] px-3 py-3 text-sm outline-none focus:border-[#7d9c3b]"
            />
            <button
              onClick={openRipio}
              className="w-full rounded-xl bg-[#173c2d] px-4 py-3.5 text-sm font-extrabold text-white"
            >
              {t.continue}
            </button>
            <p className="mt-3 text-[11px] leading-relaxed text-[#859088]">
              {t.note}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
