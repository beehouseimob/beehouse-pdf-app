// /api/install.js
import axios from 'axios';
import { saveTokens, call, getFreshTokens } from '../utils/b24.js';

// Use as variáveis de ambiente corretas
const CLIENT_ID = process.env.B24_CLIENT_ID || process.env.B_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET || process.env.B_CLIENT_SECRET;

export default async function handler(req, res) {
    const params = { ...req.query, ...req.body };
    console.log('[Install/Router] Requisição recebida...');

    const domain = params.domain || params.DOMAIN;
    const memberId = params.member_id || params.MEMBER_ID || req?.body?.auth?.member_id || req?.query?.member_id;
    const placement = params.PLACEMENT;
    const authId = params.AUTH_ID;
    const code = params.code;
    const appSid = req.query.APP_SID;
    const authType = req.query.type;

    // --- ROTEAMENTO ---
    if (placement && placement === 'CRM_COMPANY_DETAIL_TOOLBAR') {
        console.log('[Router] Detectado clique no botão CRM_COMPANY_DETAIL_TOOLBAR.');
        if (!memberId) {
             console.error('[Router] member_id não encontrado para clique de botão.');
             return res.status(400).send('Erro: Identificação do membro ausente.');
        }
        await handlePlacementClick(req, res);
    }
    else if (authId && memberId && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID presente). Placement:', placement);
        if (!placement || placement === 'DEFAULT') {
             await handleLocalInstall(req, res, params);
        } else {
             console.warn(`[Install] AUTH_ID recebido com PLACEMENT inesperado: ${placement}. Ignorando.`);
             res.status(200).send('Recebido (AUTH_ID com placement não padrão)');
        }
    }
    else if (code && domain && memberId && !authId && placement !== 'CRM_COMPANY_DETAIL_TOOLBAR') {
        console.log('[Install] Detectado fluxo OAuth (code presente).');
        await handleOAuthInstall(req, res, params);
    }
    else if (authType && memberId && !placement && !authId && !code) {
         console.log(`[Router] Detectada requisição pós-seleção (type=${authType}).`);
         await handlePostSelection(req, res);
    }
    else if (appSid && !authId && !code && !placement && !authType) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID).');
        res.status(200).send('Endpoint de instalação acessível.');
    }
    else {
        console.warn('[Install] Parâmetros não correspondem a OAuth, App Local, Clique de Botão, Pós-Seleção ou Verificação Inicial.', params);
        res.status(200).send('Tipo de requisição não processada ou já tratada.');
    }
}

// ==================================================================
// FUNÇÃO PARA INSTALAÇÃO/ATUALIZAÇÃO LOCAL
// ==================================================================
async function handleLocalInstall(req, res, params) {
    const domain = params.domain || params.DOMAIN;
    const memberId = params.member_id || params.MEMBER_ID || req?.body?.auth?.member_id;

    try {
        const tokens = {
            access_token: params.AUTH_ID,
            refresh_token: params.REFRESH_ID,
            expires_in: params.AUTH_EXPIRES ? Math.floor(Date.now() / 1000) + parseInt(params.AUTH_EXPIRES, 10) : Math.floor(Date.now() / 1000) + 3600,
            domain: domain,
            member_id: memberId
        };
        if (!tokens.access_token) throw new Error('access_token ausente.');
        if (!tokens.member_id) throw new Error('member_id ausente.');

        await saveTokens(tokens);
        await registerPlacement(req.headers.host, tokens);

        res.setHeader('Content-Type', 'text/html');
        if (params.PLACEMENT === 'DEFAULT') {
             res.send('<head><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX=window.parent.BX;if(BX){BX.ready(function(){BX.SidePanel.Instance.close();})}</script></head><body>Instalado/Atualizado! Fechando...</body>');
        } else {
             res.send('Atualização Local Processada.');
        }
    } catch (error) {
        console.error('[Install Local App] ERRO:', error.response?.data || error.details || error.message || error);
        res.status(500).send(`Erro (App Local): ${error.message}`);
    }
}

// ==================================================================
// FUNÇÃO PARA INSTALAÇÃO OAUTH
// ==================================================================
async function handleOAuthInstall(req, res, params) {
     const domain = params.domain;
     const memberId = params.member_id;
     const code = params.code;

     try {
         const tokenUrl = `https://${domain}/oauth/token/`;
         const tokenParams = { grant_type: 'authorization_code', client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code: code };
         const response = await axios.post(tokenUrl, null, { params: tokenParams });
         const tokenData = response.data;
         const tokens = {
             access_token: tokenData.access_token, refresh_token: tokenData.refresh_token,
             expires_in: Math.floor(Date.now() / 1000) + tokenData.expires_in,
             domain: tokenData.domain, member_id: tokenData.member_id
         };
         if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) throw new Error('Dados de token inválidos.');

         await saveTokens(tokens);
         await registerPlacement(req.headers.host, tokens);

         res.setHeader('Content-Type', 'text/html');
         res.send('<head><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX=window.parent.BX;if(BX){BX.ready(function(){BX.SidePanel.Instance.close();})}</script></head><body>Instalado! Fechando...</body>');
     } catch (error) {
         console.error('[Install OAuth] ERRO:', error.response?.data || error.message || error);
         res.status(500).send(`Erro (OAuth): ${error.message}`);
     }
}

// ==================================================================
// Função que lida com o clique no botão (mostra seleção)
// ==================================================================
async function handlePlacementClick(req, res) {
    console.log('[Handler] Clique de botão iniciado.');
    const memberId = req?.body?.member_id || req?.body?.auth?.member_id || req?.query?.member_id;
    if (!memberId) return res.status(400).send('Erro: Identificação do membro ausente.');

    const simulatedReqForTokens = { body: req.body, query: { ...req.query, member_id: memberId } };

    try {
        const authTokens = await getFreshTokens(simulatedReqForTokens);
        if (!authTokens) return res.status(401).send('Erro: Falha na autenticação.');

        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
            try {
                 companyId = JSON.parse(req.body.PLACEMENT_OPTIONS).ID;
            } catch (e) { return res.status(400).send('Erro placement options.'); }
        }
        if (!companyId) return res.status(400).send('ID da Empresa não encontrado.');

        res.setHeader('Content-Type', 'text/html');
        res.send(getSelectionHtml(companyId, authTokens.member_id));
    } catch (error) {
        console.error('[Handler] Erro handlePlacementClick:', error.message);
        res.status(error.status || 500).send(`Erro ao carregar seleção: ${error.message}`);
    }
}

// ==================================================================
// Função que lida com a requisição APÓS a seleção (mostra formulário)
// ==================================================================
async function handlePostSelection(req, res) {
    const authType = req.query.type;
    const companyId = req.query.companyId;
    const memberId = req.query.member_id;
    console.log(`[Handler PostSelection] type=${authType}, companyId=${companyId}, memberId=${memberId}`);
    if (!memberId) return res.status(400).send('Erro: Identificação do membro ausente.');

    const simulatedReqForTokens = { body: {}, query: { ...req.query } };

    try {
        const authTokens = await getFreshTokens(simulatedReqForTokens);
        if (!authTokens) return res.status(401).send('Erro: Falha na autenticação.');

        let contratanteData = { nome: '', cpf: '', telefone: '', email: '' }; // Para PF
        let pjData = { razaoSocial: '', cnpj: '', telefone: '', email: '', endereco: '' }; // Para PJ

        if (companyId && authType !== 'socios_qtd') {
            try {
                 const company = await call('crm.company.get', { id: companyId }, authTokens);
                 if (company) {
                    // Mapeamento para Pessoa Física
                     contratanteData = {
                         nome: company.TITLE || '',
                         telefone: (company.PHONE?.[0]?.VALUE) || '',
                         email: (company.EMAIL?.[0]?.VALUE) || '',
                         cpf: company.UF_CRM_66C37392C9F3D || ''
                     };
                    
                    // Mapeamento para Pessoa Jurídica
                    pjData = {
                         razaoSocial: company.TITLE || '',
                         telefone: (company.PHONE?.[0]?.VALUE) || '',
                         email: (company.EMAIL?.[0]?.VALUE) || '',
                         cnpj: company.UF_CRM_66C37392C9F3D || '',
                         endereco: '' 
                    };
                 }
            } catch(e){ console.error("[Handler PostSelection] Erro buscar empresa:", e.message); }
        }

        res.setHeader('Content-Type', 'text/html');
        if (authType === 'solteiro' || authType === 'casado') {
            res.send(getFormHtml(authType, contratanteData));
        } else if (authType === 'pj') {
            res.send(getFormHtmlPJ(pjData));
        } else if (authType === 'socios_qtd') {
             res.send(getSociosQtdHtml(companyId, authTokens.member_id));
        } else if (authType === 'socios_form' && req.query.qtd) {
             const numSocios = parseInt(req.query.qtd, 10);
             if (isNaN(numSocios) || numSocios < 2) return res.status(400).send('Qtd inválida.');
             res.send(getFormHtml('socios', contratanteData, numSocios));
        } else {
            res.status(400).send('Tipo inválido.');
        }
    } catch (error) {
        console.error('[Handler PostSelection] Erro geral:', error.message);
        res.status(500).send(`Erro: ${error.message}`);
    }
}

// ==================================================================
// FUNÇÕES AUXILIARES DE HTML
// ==================================================================

// HTML da tela de seleção inicial
function getSelectionHtml(companyId, memberId) {
    const buildUrl = (type) => `/api/install?type=${type}${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;
    return `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Selecionar Tipo</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px;background-color:#f9f9f9;display:flex;justify-content:center;align-items:center;min-height:90vh}.container{background:#fff;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.05);text-align:center;max-width:400px;width:100%}h2{color:#333;margin-top:0;margin-bottom:25px;font-size:1.3em}a{display:block;background-color:#007bff;color:#fff;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;text-decoration:none;margin-bottom:15px;font-weight:700;transition:background-color .2s}a:hover{background-color:#0056b3}a.secondary{background-color:#6c757d}a.secondary:hover{background-color:#5a6268}
    a.tertiary{background-color:#28a745}a.tertiary:hover{background-color:#218838}
    </style></head><body><div class="container"><h2>Selecione o Tipo de Autorização de Venda</h2><a href="${buildUrl('solteiro')}">Pessoa Física (Solteiro/Viúvo)</a><a href="${buildUrl('casado')}">Pessoa Física (Casado/União)</a><a href="${buildUrl('socios_qtd')}" class="secondary">Pessoa Física (Vários Sócios)</a>
    <a href="${buildUrl('pj')}" class="tertiary">Pessoa Jurídica (Empresa)</a>
    </div><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX&&BX.ready(function(){BX.resizeWindow(600,450),BX.setTitle("Selecionar Tipo")})</script></body></html>`;
}

// HTML para perguntar a quantidade de sócios (COM BOTÃO VOLTAR)
function getSociosQtdHtml(companyId, memberId) {
     const formAction = `/api/install`;
     const companyIdInput = companyId ? `<input type="hidden" name="companyId" value="${companyId}">` : '';
     const memberIdInput = memberId ? `<input type="hidden" name="member_id" value="${memberId}">` : '';

     return `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Qtd Sócios</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px;background-color:#f9f9f9;display:flex;justify-content:center;align-items:center;min-height:90vh}.container{background:#fff;padding:30px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.05);text-align:center;max-width:400px;width:100%}h2{color:#333;margin-top:0;margin-bottom:25px;font-size:1.3em}label{display:block;margin-bottom:10px;font-weight:600;color:#555}input[type=number]{width:80px;padding:10px;border:1px solid #ccc;border-radius:5px;font-size:16px;margin-bottom:20px;text-align:center}button{background-color:#007bff;color:#fff;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:700;transition:background-color .2s}button:hover{background-color:#0056b3}
     .back-link{display:inline-block;margin-top:15px;color:#6c757d;text-decoration:none;font-size:14px}.back-link:hover{text-decoration:underline}
     </style></head><body><div class="container"><h2>Imóvel de Sócios</h2>
       <form action="${formAction}" method="GET">
           <input type="hidden" name="type" value="socios_form">
           ${companyIdInput}
           ${memberIdInput}
           <label for="qtd">Quantos sócios são proprietários?</label>
           <input type="number" id="qtd" name="qtd" min="2" value="2" required>
           <button type="submit">Continuar</button>
       </form>
       <a href="javascript:history.back()" class="back-link">Voltar</a>
     </div><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX&&BX.ready(function(){BX.resizeWindow(600,400),BX.setTitle("Qtd Sócios")})</script></body></html>`;
}


// HTML principal do formulário (COM BOTÃO VOLTAR)
// ==================================================================
// HTML principal do formulário (CORRIGIDO - PESSOA FÍSICA)
// ==================================================================
function getFormHtml(type, contratanteData, numSocios = 1) {
    let contratanteHtml = '';

    const estadoCivilSolteiroOptions = `<option value="Solteiro(a)">Solteiro(a)</option><option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option>`;
    const estadoCivilCasadoOptions = `<option value="Casado(a)">Casado(a)</option><option value="União Estável">União Estável</option>`;
    const regimeCasamentoOptions = `<option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option><option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option><option value="Separação Total de Bens">Separação Total de Bens</option><option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option><option value="Outro">Outro</option>`;

    for (let i = 0; i < numSocios; i++) {
        const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
        const titulo = numSocios > 1 ? `SÓCIO ${i+1}` : 'CONTRATANTE';
        const nome = (i === 0) ? contratanteData.nome : '';
        const cpf = (i === 0) ? contratanteData.cpf : '';
        const telefone = (i === 0) ? contratanteData.telefone : '';
        const email = (i === 0) ? contratanteData.email : '';
        const estadoCivilOptions = (type === 'casado' && numSocios === 1) ? estadoCivilCasadoOptions : estadoCivilSolteiroOptions + estadoCivilCasadoOptions;

        // ==================================================
        // <<< LAYOUT CORRIGIDO (USANDO GRADE 3 COLUNAS) >>>
        // ==================================================
        contratanteHtml += `
            <div class="form-section">
                <h3>${titulo}</h3>
                <div class="form-grid">
                    
                    <div class="grid-col-span-2"><label>Nome:</label><input type="text" name="${prefix}Nome" value="${nome}"></div>
                    <div><label>CPF:</label><input type="text" name="${prefix}Cpf" value="${cpf}"></div>
                    
                    <div><label>Profissão:</label><input type="text" name="${prefix}Profissao"></div>
                    <div>
                        <label>Estado Civil:</label>
                        <select name="${prefix}EstadoCivil" id="${prefix}EstadoCivil" onchange="toggleRegime('${prefix}')">
                            <option value="">Selecione...</option>${estadoCivilOptions}
                        </select>
                    </div>
                    <div><label>Telefone/Celular:</label><input type="text" name="${prefix}Telefone" value="${telefone}"></div>
                    
                    <div id="${prefix}RegimeDiv" class="grid-col-span-3" style="display: none;">
                        <label>Regime de Casamento:</label>
                        <select name="${prefix}RegimeCasamento"><option value="">Selecione...</option>${regimeCasamentoOptions}</select>
                    </div>

                    <div class="grid-col-span-3"><label>Endereço Residencial:</label><input type="text" name="${prefix}Endereco" placeholder="Rua, Nº, Bairro, Cidade - SC"></div>
                    
                    <div class="grid-col-span-3"><label>E-mail:</label><input type="email" name="${prefix}Email" value="${email}"></div>
                </div>
            </div>`;
    }

    // <<< LAYOUT CORRIGIDO CÔNJUGE >>>
    const conjugeHtml = type === 'casado' ? `
        <div class="form-section">
            <h3>CÔNJUGE</h3>
             <div class="form-grid">
                 <div class="grid-col-span-2"><label>Nome:</label><input type="text" name="conjugeNome"></div>
                 <div><label>CPF:</label><input type="text" name="conjugeCpf"></div>
                 
                 <div><label>Profissão:</label><input type="text" name="conjugeProfissao"></div>
                 <div class="grid-col-span-2"><label>Email:</label><input type="text" name="conjugeEmail" placeholder="Ex: email@example.com"></div>
             </div>
        </div>` : '';
    
    // CSS unificado (mantendo a consistência com o resto do sistema)
    const formCss = `body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px;background-color:#f9f9f9}h2{color:#333;border-bottom:2px solid #eee;padding-bottom:10px}form{max-width:800px;margin:20px auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.05)}.form-section{margin-bottom:25px;border-bottom:1px solid #f0f0f0;padding-bottom:20px}.form-section:last-of-type{border-bottom:none}h3{color:#0056b3;margin-top:0;margin-bottom:15px;font-size:1.1em;border-left:3px solid #007bff;padding-left:8px}h3.pj{color:#218838;border-left:3px solid #28a745}
    
    /* Grade Padrão (3 colunas responsivas) */
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:start}
    
    div{margin-bottom:0}label{display:block;margin-bottom:6px;font-weight:600;color:#555;font-size:13px}input[type=text],input[type=number],input[type=email],select{width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;font-size:14px;box-sizing:border-box;height:38px}input:focus,select:focus{border-color:#007bff;outline:0;box-shadow:0 0 0 2px rgba(0,123,255,.25)}
    
    /* Spans auxiliares */
    .grid-col-span-2{grid-column:span 2}
    .grid-col-span-3{grid-column:1 / -1} /* Ocupa linha toda */
    
    button{background-color:#007bff;color:#fff;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:700;transition:background-color .2s}button:hover{background-color:#0056b3}.button-container{text-align:center;margin-top:20px}
    .back-link{display:block;margin-top:15px;color:#6c757d;text-decoration:none;font-size:14px}.back-link:hover{text-decoration:underline}
    
    @media (max-width:600px){
      .form-grid{grid-template-columns:1fr}
      .grid-col-span-2{grid-column:span 1}
      .grid-col-span-3{grid-column:span 1}
    }`;

    // Seções de Imóvel e Contrato (comuns a ambos os formulários)
    const imovelEContratoHtml = `
        <div class="form-section"><h3>IMÓVEL</h3><div class="form-grid"><div class="grid-col-span-3"><label>Imóvel (Descrição):</label><input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol"></div><div class="grid-col-span-3"><label>Endereço do Imóvel:</label><input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC"></div><div class="grid-col-span-2"><label>Inscrição Imobiliária/Matrícula:</label><input type="text" name="imovelMatricula" placeholder="Nº da matrícula"></div><div><label>Valor do Imóvel (R$):</label><input type="number" name="imovelValor" step="0.01" placeholder="500000.00"></div><div class="grid-col-span-2"><label>Administradora de Condomínio:</label><input type="text" name="imovelAdminCondominio"></div><div><label>Valor Condomínio (R$):</label><input type="number" name="imovelValorCondominio" step="0.01" placeholder="350.00"></div><div><label>Chamada de Capital:</label><input type="text" name="imovelChamadaCapital" placeholder="Ex: R$ 100,00"></div><div class="grid-col-span-2"><label>Nº de parcelas (Chamada Capital):</label><input type="number" name="imovelNumParcelas"></div></div></div><div class="form-section"><h3>CONTRATO</h3><div class="form-grid"><div><label>Prazo de exclusividade (dias):</label><input type="number" name="contratoPrazo" value="90" required></div><div><label>Comissão (%):</label><input type="number" name="contratoComissaoPct" value="6" step="0.1" required></div></div></div>
    `;

    return `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Gerar Autorização</title><style>${formCss}</style></head><body><form action="/api/generate-pdf" method="POST" target="_blank"><h2>Gerar Autorização de Venda</h2><p>Confira os dados pré-preenchidos (eles são editáveis) e preencha os campos manuais.</p><input type="hidden" name="authType" value="${type}">${numSocios>1?`<input type="hidden" name="numSocios" value="${numSocios}">`:""}${contratanteHtml}${conjugeHtml}${imovelEContratoHtml}
    
    <div class="button-container">
        <button type="submit">Gerar PDF</button>
        <a href="javascript:history.back()" class="back-link">Voltar</a>
    </div>

    </form><script src="//api.bitrix24.com/api/v1/"></script><script>function toggleRegime(e){let t=document.getElementById(e+"EstadoCivil"),o=document.getElementById(e+"RegimeDiv");if(t&&o){let n=t.value;"Casado(a)"===n||"União Estável"===n?o.style.display="block":o.style.display="none";let l=o.querySelector("select");l&&(l.value="")}}document.addEventListener("DOMContentLoaded",function(){let e=${numSocios};for(let t=0;t<e;t++){let o=e>1?\`socio\${t+1}\`:"contratante";toggleRegime(o)}window.BX&&BX.ready(function(){BX.resizeWindow(window.innerWidth>850?850:window.innerWidth,700),BX.setTitle("Gerar Autorização")})});</script></body></html>`;
}


// ==================================================================
// <<< FUNÇÃO HTML PARA PESSOA JURÍDICA (Usa .form-grid) >>>
// ==================================================================
function getFormHtmlPJ(pjData) {
    // CSS Padrão (o mesmo do getFormHtml)
    const formCss = `body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;margin:0;padding:24px;background-color:#f9f9f9}h2{color:#333;border-bottom:2px solid #eee;padding-bottom:10px}form{max-width:800px;margin:20px auto;background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.05)}.form-section{margin-bottom:25px;border-bottom:1px solid #f0f0f0;padding-bottom:20px}.form-section:last-of-type{border-bottom:none}h3{color:#0056b3;margin-top:0;margin-bottom:15px;font-size:1.1em;border-left:3px solid #007bff;padding-left:8px}h3.pj{color:#218838;border-left:3px solid #28a745}
    
    /* Grade Padrão (3 colunas) */
    .form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:start}
    
    /* <<< NOVA Grade de 2 Colunas para PF >>> */
    .form-grid-2-col {display:grid;grid-template-columns:repeat(2, 1fr);gap:16px;align-items:start}
    
    div{margin-bottom:0}label{display:block;margin-bottom:6px;font-weight:600;color:#555;font-size:13px}input[type=text],input[type=number],input[type=email],select{width:100%;padding:10px;border:1px solid #ccc;border-radius:5px;font-size:14px;box-sizing:border-box;height:38px}input:focus,select:focus{border-color:#007bff;outline:0;box-shadow:0 0 0 2px rgba(0,123,255,.25)}
    
    /* Spans para as duas grades */
    .grid-col-span-2{grid-column:span 2}
    .grid-col-span-3{grid-column:1 / -1}
    
    button{background-color:#007bff;color:#fff;padding:12px 20px;border:none;border-radius:5px;cursor:pointer;font-size:16px;font-weight:700;transition:background-color .2s}button:hover{background-color:#0056b3}.button-container{text-align:center;margin-top:20px}
    .back-link{display:block;margin-top:15px;color:#6c757d;text-decoration:none;font-size:14px}.back-link:hover{text-decoration:underline}
    
    @media (max-width:600px){
      .form-grid{grid-template-columns:1fr}
      .form-grid-2-col{grid-template-columns:1fr}
      .grid-col-span-2{grid-column:span 1}
      .grid-col-span-3{grid-column:span 1}
    }`;

    // Seções de Imóvel e Contrato (comuns a ambos os formulários)
    // <<< USA A GRADE DE 3 COLUNAS PADRÃO (.form-grid) >>>
    const imovelEContratoHtml = `
        <div class="form-section"><h3>IMÓVEL</h3><div class="form-grid"><div class="grid-col-span-3"><label>Imóvel (Descrição):</label><input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol"></div><div class="grid-col-span-3"><label>Endereço do Imóvel:</label><input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC"></div><div class="grid-col-span-2"><label>Inscrição Imobiliária/Matrícula:</label><input type="text" name="imovelMatricula" placeholder="Nº da matrícula"></div><div><label>Valor do Imóvel (R$):</label><input type="number" name="imovelValor" step="0.01" placeholder="500000.00"></div><div class="grid-col-span-2"><label>Administradora de Condomínio:</label><input type="text" name="imovelAdminCondominio"></div><div><label>Valor Condomínio (R$):</label><input type="number" name="imovelValorCondominio" step="0.01" placeholder="350.00"></div><div><label>Chamada de Capital:</label><input type="text" name="imovelChamadaCapital" placeholder="Ex: R$ 100,00"></div><div class="grid-col-span-2"><label>Nº de parcelas (Chamada Capital):</label><input type="number" name="imovelNumParcelas"></div></div></div><div class="form-section"><h3>CONTRATO</h3><div class="form-grid"><div><label>Prazo de exclusividade (dias):</label><input type="number" name="contratoPrazo" value="90" required></div><div><label>Comissão (%):</label><input type="number" name="contratoComissaoPct" value="6" step="0.1" required></div></div></div>
    `;

    // Bloco HTML Específico para PJ (COM RG REMOVIDO)
    // <<< USA A GRADE DE 3 COLUNAS PADRÃO (.form-grid) >>>
    const pjHtml = `
        <div class="form-section">
            <h3 class="pj">EMPRESA (CONTRATANTE)</h3>
            <div class="form-grid">
                <div class="grid-col-span-3"><label>Razão Social:</label><input type="text" name="empresaRazaoSocial" value="${pjData.razaoSocial}"></div>
                <div><label>CNPJ:</label><input type="text" name="empresaCnpj" value="${pjData.cnpj}"></div>
                <div class="grid-col-span-2"><label>Inscrição Estadual/Municipal:</label><input type="text" name="empresaIe" placeholder="(Opcional)"></div>
                <div class="grid-col-span-3"><label>Endereço da Sede:</label><input type="text" name="empresaEndereco" value="${pjData.endereco}" placeholder="Rua, Nº, Bairro, Cidade - SC"></div>
                <div><label>Telefone/Celular:</label><input type="text" name="empresaTelefone" value="${pjData.telefone}"></div>
                <div class="grid-col-span-2"><label>E-mail:</label><input type="email" name="empresaEmail" value="${pjData.email}"></div>
            </div>
        </div>
        <div class="form-section">
            <h3 class="pj">REPRESENTANTE LEGAL</h3>
            <div class="form-grid">
                <div><label>Nome Completo:</label><input type="text" name="repNome"></div>
                <div><label>CPF:</label><input type="text" name="repCpf"></div>
                <div><label>Cargo:</label><input type="text" name="repCargo" placeholder="Ex: Sócio-Administrador"></div>
            </div>
        </div>
    `;


    return `<!DOCTYPE html><html lang="pt-br"><head><meta charset="UTF-8"><title>Gerar Autorização</title><style>${formCss}</style></head><body><form action="/api/generate-pdf" method="POST" target="_blank"><h2>Gerar Autorização de Venda (PJ)</h2><p>Confira os dados pré-preenchidos (eles são editáveis) e preencha os campos manuais.</p><input type="hidden" name="authType" value="pj">${pjHtml}${imovelEContratoHtml}
    
    <div class="button-container">
        <button type="submit">Gerar PDF</button>
        <a href="javascript:history.back()" class="back-link">Voltar</a>
    </div>

    </form><script src="//api.bitrix24.com/api/v1/"></script><script>document.addEventListener("DOMContentLoaded",function(){window.BX&&BX.ready(function(){BX.resizeWindow(window.innerWidth>850?850:window.innerWidth,700),BX.setTitle("Gerar Autorização (PJ)")})});</script></body></html>`;
}


// ==================================================================
// <<< FUNÇÃO DE REGISTRO COMPLETA (COLE ESSA) >>>
// ==================================================================
async function registerPlacement(appHost, tokens) { // Recebe appHost (ex: req.headers.host)
    if (!tokens || !tokens.access_token) {
        console.error('[Install Register] Tokens inválidos.');
        throw new Error('Tokens inválidos para registrar placement.');
    }
    console.log(`[Install Register] Iniciando registro de todos os placements...`);

    const appBaseUrl = `https://${appHost}`;

    // --- 1. App Gerador de PDF (Botão na Empresa) ---
    const pdfButtonCode = 'CRM_COMPANY_DETAIL_TOOLBAR';
    const pdfButtonHandler = `${appBaseUrl}/api/install`; // Aponta para o próprio install.js
    
    console.log(`[Install] Registrando ${pdfButtonCode}...`);
    try {
        await call('placement.unbind', { PLACEMENT: pdfButtonCode, HANDLER: pdfButtonHandler }, tokens);
    } catch (e) { console.log('Handler PDF antigo não encontrado (ok).'); }
    await call('placement.bind', {
        PLACEMENT: pdfButtonCode,
        HANDLER: pdfButtonHandler,
        TITLE: 'Gerar Autorização PDF',
        DESCRIPTION: 'Gera PDF de autorização de vendas'
    }, tokens);
    console.log(`[Install] ${pdfButtonCode} registrado.`);

    // --- 2. App Buscador de Imóveis (Aba no Lead) ---
    const leadTabCode = 'CRM_LEAD_DETAIL_TAB';
    const leadTabHandler = `${appBaseUrl}/api/lead-app`;

    console.log(`[Install] Registrando ${leadTabCode}...`);
    try {
        await call('placement.unbind', { PLACEMENT: leadTabCode, HANDLER: leadTabHandler }, tokens);
    } catch (e) { console.log('Handler Buscador antigo não encontrado (ok).'); }
    await call('placement.bind', {
        PLACEMENT: leadTabCode,
        HANDLER: leadTabHandler,
        TITLE: 'Buscador de Imóveis',
        DESCRIPTION: 'Busca imóveis compatíveis com o perfil do lead'
    }, tokens);
    console.log(`[Install] ${leadTabCode} registrado.`);

    // --- 3. App LMS - Aluno (Aba no Perfil) ---
    const profileTabCode = 'USER_PROFILE_TAB';
    const profileTabHandler = `${appBaseUrl}/api/lms-app`;

    console.log(`[Install] Registrando ${profileTabCode}...`);
    try {
        await call('placement.unbind', { PLACEMENT: profileTabCode, HANDLER: profileTabHandler }, tokens);
    } catch (e) { console.log('Handler LMS Aluno antigo não encontrado (ok).'); }
    await call('placement.bind', {
        PLACEMENT: profileTabCode,
        HANDLER: profileTabHandler,
        TITLE: 'Portal de Cursos',
        DESCRIPTION: 'Exibe os cursos e o progresso do colaborador'
    }, tokens);
    console.log(`[Install] ${profileTabCode} registrado.`);

    // --- 4. App LMS - Admin (Menu Principal) ---
    const adminMenuCode = 'MAIN_MENU';
    const adminMenuHandler = `${appBaseUrl}/api/lms-admin-app`;

    console.log(`[Install] Registrando ${adminMenuCode}...`);
    try {
        await call('placement.unbind', { PLACEMENT: adminMenuCode, HANDLER: adminMenuHandler }, tokens);
    } catch (e) { console.log('Handler LMS Admin antigo não encontrado (ok).'); }
    await call('placement.bind', {
        PLACEMENT: adminMenuCode,
        HANDLER: adminMenuHandler,
        TITLE: 'Gestão de Cursos',
        DESCRIPTION: 'Gerenciar cursos do portal'
    }, tokens);
    console.log(`[Install] ${adminMenuCode} registrado.`);
    
    // --- 5. App Agendador (Sidebar do Chat) ---
    const chatSidebarCode = 'IM_CHAT_SIDEBAR';
    const chatSidebarHandler = `${appBaseUrl}/api/agendar-chamada-app`; 

    console.log(`[Install] Registrando ${chatSidebarCode}...`);
    try {
        await call('placement.unbind', { PLACEMENT: chatSidebarCode, HANDLER: chatSidebarHandler }, tokens);
    } catch (e) { console.log('Handler da Sidebar de Chat antigo não encontrado (ok).'); }
    
    await call('placement.bind', {
        PLACEMENT: chatSidebarCode,
        HANDLER: chatSidebarHandler,
        TITLE: 'Agendar Reunião', // Texto que aparece ao passar o mouse
        DESCRIPTION: 'Agenda uma chamada no calendário com os participantes do chat'
    }, tokens);
    console.log(`[Install] ${chatSidebarCode} registrado.`);

    console.log('[Install Register] Todos placements registrados.');
}