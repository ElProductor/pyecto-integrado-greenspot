import React, { useState } from 'react';
import { 
  Sparkles, 
  X, 
  Sliders, 
  FileText, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Copy, 
  Check, 
  Send, 
  Bot, 
  Flame, 
  Layers, 
  Cpu
} from 'lucide-react';
import { useToast } from './Toast';

interface CopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CopilotModal: React.FC<CopilotModalProps> = ({ isOpen, onClose }) => {
  const { success } = useToast();
  const [activeTab, setActiveTab] = useState<'blend' | 'esg' | 'rep' | 'chat'>('blend');
  const [copied, setCopied] = useState(false);

  // Blend Calculator State
  const [buoyWeight, setBuoyWeight] = useState(70); // % Flake Boyas (MFI 0.85)
  const [pipeWeight, setPipeWeight] = useState(30); // % Flake Tuberías (MFI 0.30)
  
  // MFI calculation using Bingham-Arrhenius log mixing rule: log(MFI) = w1*log(MFI1) + w2*log(MFI2)
  const mfi1 = 0.85;
  const mfi2 = 0.30;
  const w1 = buoyWeight / 100;
  const w2 = pipeWeight / 100;
  const logBlend = w1 * Math.log10(mfi1) + w2 * Math.log10(mfi2);
  const calculatedMfi = Math.pow(10, logBlend).toFixed(2);
  const targetApplication = Number(calculatedMfi) > 0.65 ? 'Inyección (Cajones, Pallets, Accesorios)' : 'Extrusión (Perfiles, Ductos, Ecomadera)';

  // ESG Memo State
  const [companyName, setCompanyName] = useState('AquaChile S.A.');
  const [memoTonnage, setMemoTonnage] = useState(14.5);
  const avoidedCo2 = (memoTonnage * 1850).toLocaleString('es-CL');
  const avoidedWater = (memoTonnage * 5000).toLocaleString('es-CL');

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hola. Soy el Copiloto de Inteligencia Circular Greenspot. Puedo predecir mezclas de polímeros, auditar multas REP de la SMA o redactar memorandos de impacto ambiental para directorios de la salmonicultura.',
      time: 'Ahora'
    }
  ]);

  if (!isOpen) return null;

  const handleCopyMemo = () => {
    const text = `DECLARACIÓN CORPORATIVA DE IMPACTO AMBIENTAL SCOPE 3 (GHG PROTOCOL)
Empresa: ${companyName}
Proveedor Circular: Greenspot SpA (Red Resiter)
Plástico Acuícola Valorizado: ${memoTonnage} Toneladas (Boyas & Tuberías HDPE)
Reducción de Emisiones: ${avoidedCo2} kg CO2eq (Factor de emisión certificado: 1.85 kg CO2eq/kg)
Ahorro Hídrico Preservado: ${avoidedWater} Litros H2O
Destino de Transformación: Pellet Inyección Grado Industrial / Ecomadera
Conformidad Legal: Ley 20.920 (Responsabilidad Extendida del Productor)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    success('Memorando ESG copiado al portapapeles');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    const newMessages = [
      ...messages,
      { sender: 'user' as const, text: userText, time: 'Ahora' }
    ];
    setMessages(newMessages);
    setChatInput('');

    // Fast intelligent rule-based simulation
    setTimeout(() => {
      let reply = 'He analizado tu consulta en el balance de masa de planta. Los parámetros son consistentes con las directrices técnicas de Greenspot.';
      const lower = userText.toLowerCase();

      if (lower.includes('temperatura') || lower.includes('extrusora') || lower.includes('perfil')) {
        reply = 'Para HDPE reciclado post-marino (boyas/ductos), la curva térmica óptima en doble husillo es: Zona 1 (Alimentación): 170°C; Zona 2-3 (Compresión): 190°C-195°C; Zona 4 (Desgasificado al vacío): 205°C; Cabezal: 210°C con malla filtrante 80 mesh para retener micro-incrustaciones calcáreas.';
      } else if (lower.includes('eps') || lower.includes('plumavit') || lower.includes('cajas')) {
        reply = 'El EPS de cosecha de salmón posee una densidad virgen de 0.025 g/cm3. Al termocompactar en Dalcahue se eleva a 0.35 g/cm3 (factor de reducción 14:1 en volumen logístico), ahorrando un 92% en fletes marítimos hacia Puerto Montt.';
      } else if (lower.includes('sma') || lower.includes('multa') || lower.includes('rep')) {
        reply = 'Bajo el Decreto Supremo N° 12 de la Ley REP, el incumplimiento de metas para envases industriales acarrea sanciones graves de hasta 10.000 UTA (~$7.900 millones CLP). Greenspot emite el Certificado de Destino Final acreditado que extingue dicha responsabilidad.';
      }

      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: reply, time: 'Ahora' }
      ]);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div 
        className="bg-white dark:bg-[#121316] rounded-2xl max-w-2xl w-full border border-neutral-200/80 dark:border-neutral-800 shadow-elevated overflow-hidden flex flex-col max-h-[85vh] animate-[fadeIn_0.15s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Greenspot Copilot
                </h3>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                  AI & Rheology Engine
                </span>
              </div>
              <p className="text-[11px] text-neutral-400">
                Modelos predictivos de polímeros y acreditación Scope 3
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-neutral-100 dark:border-neutral-800/80 px-5 bg-neutral-50/50 dark:bg-neutral-900/30 text-xs font-medium">
          <button
            onClick={() => setActiveTab('blend')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'blend'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Optimizador de Mezclas</span>
          </button>

          <button
            onClick={() => setActiveTab('esg')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'esg'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Generador ESG Scope 3</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-300'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Consulta Técnica IA</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {/* TAB 1: OPTIMIZADOR DE MEZCLAS */}
          {activeTab === 'blend' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Predicción reológica basada en la regla logarítmica de Bingham-Arrhenius para estimar el Índice de Fluidez (MFI) resultante antes de alimentar la extrusora.
              </p>

              <div className="space-y-3 bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl border border-neutral-100 dark:border-neutral-800/60">
                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Flake Boyas HDPE (MFI nominal: 0.85 g/10min)
                    </span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{buoyWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={buoyWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setBuoyWeight(val);
                      setPipeWeight(100 - val);
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-medium">
                    <span className="text-neutral-700 dark:text-neutral-300">
                      Flake Tuberías HDPE 400mm (MFI nominal: 0.30 g/10min)
                    </span>
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">{pipeWeight}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="90"
                    value={pipeWeight}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setPipeWeight(val);
                      setBuoyWeight(100 - val);
                    }}
                    className="w-full accent-emerald-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Output Results */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 rounded-xl">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 dark:text-emerald-400 block mb-0.5">
                    MFI Resultante Estimado
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold font-mono text-emerald-900 dark:text-emerald-200">{calculatedMfi}</span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400">g/10 min (190°C/2.16kg)</span>
                  </div>
                </div>

                <div className="p-3.5 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/60 dark:border-neutral-800 rounded-xl">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 block mb-0.5">
                    Aplicación Recomendada
                  </span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block mt-1 leading-snug">
                    {targetApplication}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-neutral-50/70 dark:bg-neutral-900/40 rounded-xl border border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 space-y-1">
                <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                  Recomendación de Procesamiento en Planta Trapén:
                </div>
                <div>• Perfil térmico sugerido: 175°C - 195°C - 210°C (Cabezal).</div>
                <div>• Vacío de desgasificado: &gt; 0.85 bar para eliminar humedad marina.</div>
                <div>• Paquete de filtros: Malla 80 / 120 / 80 mesh.</div>
              </div>
            </div>
          )}

          {/* TAB 2: GENERADOR ESG SCOPE 3 */}
          {activeTab === 'esg' && (
            <div className="space-y-4">
              <p className="text-xs text-neutral-500 leading-relaxed">
                Genera en 1 clic el memorando oficial listo para adjuntar en los Reportes de Sostenibilidad corporativa de las empresas socias.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-neutral-500 mb-1 font-medium">Empresa Generadora</label>
                  <select
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
                  >
                    <option value="AquaChile S.A.">AquaChile S.A.</option>
                    <option value="Cermaq Chile">Cermaq Chile</option>
                    <option value="Salmones Camanchaca">Salmones Camanchaca</option>
                    <option value="Multi X">Multi X</option>
                  </select>
                </div>

                <div>
                  <label className="block text-neutral-500 mb-1 font-medium">Toneladas Valorizadas</label>
                  <input
                    type="number"
                    step="0.5"
                    value={memoTonnage}
                    onChange={(e) => setMemoTonnage(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Memo Preview */}
              <div className="p-4 bg-neutral-900 text-neutral-200 rounded-xl font-mono text-[11px] leading-relaxed relative border border-neutral-800">
                <button
                  onClick={handleCopyMemo}
                  className="absolute top-3 right-3 p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors flex items-center gap-1 text-[10px]"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copiado' : 'Copiar Memo'}</span>
                </button>

                <div className="text-emerald-400 font-bold mb-2">
                  // MEMO AUDITABLE GHG PROTOCOL (SCOPE 3)
                </div>
                <div>EMPRESA: {companyName}</div>
                <div>VALORIZADOR CERTIFICADO: Greenspot SpA (Red Resiter)</div>
                <div>RESIDUO ACUÍCOLA: {memoTonnage} t HDPE (Boyas & Tuberías)</div>
                <div>CO2eq EVITADO: {avoidedCo2} kg (Factor: 1.85 kg/kg)</div>
                <div>AGUA PRESERVADA: {avoidedWater} Litros H2O</div>
                <div>DESTINO: Pellet Circular Grado Virgen / Ecomadera</div>
              </div>
            </div>
          )}

          {/* TAB 3: CONSULTA TÉCNICA IA */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-80 justify-between">
              <div className="overflow-y-auto space-y-3 pr-2 flex-1">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`p-3 rounded-xl max-w-[85%] text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-neutral-900 text-white dark:bg-emerald-600'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex gap-2">
                <input
                  type="text"
                  placeholder="Pregunta sobre temperaturas, factores de CO2, densidad EPS o Ley REP..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs text-neutral-800 dark:text-neutral-200 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
