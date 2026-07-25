import React, { useState, useEffect } from "react";
import { 
  auth, 
  googleProvider 
} from "../utils/firebase";
import { 
  signInWithPopup
} from "firebase/auth";
import { motion, AnimatePresence } from "motion/react";
import { Chrome, AlertCircle, RefreshCw, CheckCircle, ChevronDown, ChevronUp, HelpCircle, ExternalLink, Info, Globe } from "lucide-react";

interface AuthPortalProps {
  onAuthSuccess: () => void;
}

export default function AuthPortal({ onAuthSuccess }: AuthPortalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showGoogleHelp, setShowGoogleHelp] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Check if running inside an iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch (e) {
      setIsInIframe(true);
    }
  }, []);

  const handleGoogleAuth = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setSuccess("Autenticado via Google com sucesso!");
      setTimeout(() => {
        onAuthSuccess();
      }, 1000);
    } catch (err: any) {
      console.error("Erro ao autenticar com Google:", err);
      setShowGoogleHelp(true);
      
      let localizedError = "Não foi possível autenticar com a conta Google.";
      
      if (err.code === "auth/popup-closed-by-user") {
        localizedError = "O pop-up de login foi fechado antes de concluir a autenticação. Se o problema persistir, clique em 'Abrir em Nova Aba' acima para realizar o login seguro fora do visualizador do AI Studio.";
      } else if (err.code === "auth/popup-blocked") {
        localizedError = "O pop-up foi bloqueado pelo seu navegador. Por favor, libere os pop-ups para este site e tente novamente.";
      } else if (err.code === "auth/operation-not-allowed") {
        localizedError = "O provedor de login do Google não está ativado no Firebase Console. Ative o Google em Authentication > Sign-in method no Firebase.";
      } else if (err.code === "auth/unauthorized-domain") {
        localizedError = "Este domínio não está autorizado nas configurações do Firebase. É necessário adicionar os domínios do AI Studio na lista de domínios autorizados do Firebase.";
      } else if (err.code === "auth/web-storage-unsupported") {
        localizedError = "O armazenamento web não é suportado ou está bloqueado (geralmente devido a restrições de cookies de terceiros no iframe do AI Studio). Tente abrir o aplicativo em uma nova aba do navegador.";
      } else if (err.message) {
        localizedError = `Erro na autenticação Google: ${err.message} (Código: ${err.code || "desconhecido"})`;
      }
      
      setError(localizedError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1329] text-gray-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative ambient background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* App Logo and Greeting Card */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex p-3.5 rounded-2xl bg-blue-600 text-white shadow-xl shadow-blue-500/20 mb-4"
          >
            <RefreshCw className="w-8 h-8 animate-spin-slow text-blue-100" />
          </motion.div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">
            Estudos de Alto Rendimento
          </h1>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            Acesse de forma simples e rápida com sua Conta Google para planejar, monitorar e acelerar seus estudos.
          </p>
        </div>

        {/* Main Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="bg-[#0f1b35] border border-[#1e2d4d] rounded-2xl shadow-2xl p-6 sm:p-8"
        >
          {/* Iframe Warning Banner */}
          {isInIframe && (
            <div className="mb-6 p-4 bg-blue-950/50 border border-blue-500/30 rounded-xl text-xs text-blue-200 leading-relaxed shadow-lg">
              <div className="flex items-center space-x-2 font-bold text-blue-300 mb-1.5">
                <Info className="w-4 h-4 shrink-0 text-blue-400" />
                <span>Compatibilidade do Google no AI Studio</span>
              </div>
              <p className="mb-3">
                O login com o Google costuma falhar ou fechar sozinho no visualizador interno (iframe) devido ao bloqueio de cookies de terceiros pelo navegador.
              </p>
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-xs transition-all shadow-md shadow-blue-500/10 no-underline cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir em Nova Aba (Login Seguro)</span>
              </a>
            </div>
          )}

          {/* Messages alerts */}
          {error && (
            <div className="flex flex-col space-y-3 p-4 mb-5 bg-red-900/20 border border-red-500/30 text-red-400 rounded-xl text-sm">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
              {(error.includes("Google") || error.includes("pop-up") || error.includes("aba") || error.includes("domínio")) && (
                <div className="pt-2 border-t border-red-500/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <span className="text-xs text-red-300/80">
                    O navegador bloqueia pop-ups e cookies no visualizador do AI Studio.
                  </span>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-blue-600/20 no-underline cursor-pointer shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir em Nova Aba</span>
                  </a>
                </div>
              )}
            </div>
          )}

          {success && (
            <div className="flex items-start space-x-2.5 p-3.5 mb-5 bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 rounded-xl text-sm">
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Google SSO Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center justify-center space-x-2.5 cursor-pointer disabled:opacity-50 mb-1 shadow-lg shadow-blue-500/10"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Chrome className="w-4 h-4 text-blue-100" />
            )}
            <span>Acessar com Conta Google</span>
          </button>

          {/* Troubleshooting Collapsible */}
          <div className="mt-4 border-t border-[#1e2d4d]/60 pt-4">
            <button
              type="button"
              onClick={() => setShowGoogleHelp(!showGoogleHelp)}
              className="w-full flex items-center justify-between text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors py-1 cursor-pointer"
            >
              <div className="flex items-center space-x-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
                <span>Problemas com o Login Google? Veja como resolver</span>
              </div>
              {showGoogleHelp ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <AnimatePresence>
              {showGoogleHelp && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 space-y-3.5 text-xs text-gray-400 border-l border-blue-500/30 pl-3.5 py-1"
                >
                  <div>
                    <div className="flex items-center space-x-1 text-blue-300 font-bold mb-1">
                      <Globe className="w-3 h-3" />
                      <span>1. Iframe e Cookies de Terceiros</span>
                    </div>
                    <p className="leading-relaxed">
                      Por rodar dentro do visualizador (iframe) do AI Studio, o navegador pode bloquear a autenticação devido a restrições de cookies.
                    </p>
                    <p className="mt-1 font-semibold text-blue-400">
                      💡 Solução: Clique no botão de <span className="underline">Abrir em nova aba</span> (canto superior direito do AI Studio) e faça o login diretamente.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-1 text-emerald-300 font-bold mb-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>2. Provedor Google no Firebase</span>
                    </div>
                    <p className="leading-relaxed">
                      Certifique-se de que o método de login com o Google está ativado em seu Firebase.
                    </p>
                    <p className="mt-1">
                      💡 Solução: Vá no <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline inline-flex items-center gap-0.5 font-semibold">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a> &gt; <strong>Authentication</strong> &gt; aba <strong>Sign-in method</strong> &gt; ative o provedor <strong>Google</strong>.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center space-x-1 text-amber-300 font-bold mb-1">
                      <Info className="w-3 h-3" />
                      <span>3. Domínios Autorizados</span>
                    </div>
                    <p className="leading-relaxed">
                      Seu projeto do Firebase precisa autorizar os domínios do AI Studio para que o login funcione.
                    </p>
                    <p className="mt-1.5 leading-relaxed">
                      💡 Solução: No Firebase Console &gt; <strong>Authentication</strong> &gt; aba <strong>Settings</strong> &gt; <strong>Authorized domains</strong>, clique em "Adicionar domínio" e cole estes dois endereços:
                    </p>
                    <div className="mt-1 bg-[#0b1329] border border-[#1e2d4d] rounded p-2 font-mono text-[10px] text-gray-300 select-all space-y-1">
                      <div>ais-dev-hkcqlit6mbyvbcwtff4qvz-203247573232.us-east1.run.app</div>
                      <div>ais-pre-hkcqlit6mbyvbcwtff4qvz-203247573232.us-east1.run.app</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        
        {/* Footer info */}
        <p className="text-center text-xs text-gray-500 mt-6 tracking-wide">
          Seus dados serão criptografados e armazenados com segurança.
        </p>
      </div>
    </div>
  );
}
