// /api/install.js
import axios from 'axios';
// Importa as funções do seu utils/b24.js
import { saveTokens, call, getFreshTokens } from '../utils/b24.js';

// Use as variáveis de ambiente corretas (verifique seu .env na Vercel)
const CLIENT_ID = process.env.B24_CLIENT_ID || process.env.B_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET || process.env.B_CLIENT_SECRET;

export default async function handler(req, res) {
    // Unifica query e body
    const params = { ...req.query, ...req.body };
    console.log('[Install/Router] Requisição recebida...');
    console.log('[Install/Router] Query Params:', req.query);
    console.log('[Install/Router] Body Params:', req.body);

    const domain = params.domain || params.DOMAIN;
    // Garante que member_id seja pego de qualquer fonte
    const memberId = params.member_id || params.MEMBER_ID || req?.body?.auth?.member_id || req?.query?.member_id;
    const placement = params.PLACEMENT;
    const authId = params.AUTH_ID;
    const code = params.code;
    const appSid = req.query.APP_SID;
    const authType = req.query.type; // Parâmetro para fluxo pós-seleção

    // --- ROTEAMENTO COM PRIORIDADE CORRIGIDA ---

    // PRIORIDADE 1: Clique no Botão (Placement Específico)
    if (placement && placement === 'CRM_COMPANY_DETAIL_TOOLBAR') {
        console.log('[Router] Detectado clique no botão CRM_COMPANY_DETAIL_TOOLBAR.');
        if (!memberId) {
             console.error('[Router] member_id não encontrado para clique de botão.');
             return res.status(400).send('Erro: Identificação do membro ausente.');
        }
        await handlePlacementClick(req, res); // Mostra tela de seleção
    }
    // PRIORIDADE 2: Fluxo de App Local (AUTH_ID presente, mas NÃO é o clique do botão)
    else if (authId && memberId && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID presente). Placement:', placement);
        // Só executa a instalação se o placement for 'DEFAULT' ou ausente
        if (!placement || placement === 'DEFAULT') {
             await handleLocalInstall(req, res, params);
        } else {
             console.warn(`[Install] AUTH_ID recebido com PLACEMENT inesperado: ${placement}. Ignorando.`);
             res.status(200).send('Recebido (AUTH_ID com placement não padrão)');
        }
    }
    // PRIORIDADE 3: Fluxo OAuth (code presente, sem AUTH_ID e sem clique de botão)
    else if (code && domain && memberId && !authId && placement !== 'CRM_COMPANY_DETAIL_TOOLBAR') {
        console.log('[Install] Detectado fluxo OAuth (code presente).');
        await handleOAuthInstall(req, res, params);
    }
    // PRIORIDADE 4: Requisição Pós-Seleção (parâmetro 'type', SEM PLACEMENT)
    else if (authType && memberId && !placement && !authId && !code) {
         console.log(`[Router] Detectada requisição pós-seleção (type=${authType}).`);
         await handlePostSelection(req, res); // Mostra formulário correto
    }
    // PRIORIDADE 5: Chamada inicial de verificação (APP_SID, sem outros identificadores)
    else if (appSid && !authId && !code && !placement && !authType) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID).');
        res.status(200).send('Endpoint de instalação acessível.');
    }
    // FLUXO NÃO RECONHECIDO
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

        if (!tokens.access_token) throw new Error('access_token ausente no fluxo de App Local.');
        if (!tokens.member_id) throw new Error('member_id ausente no fluxo de App Local.');

        console.log('[Install Local App] Salvando tokens para member_id:', tokens.member_id);
        await saveTokens(tokens);
        console.log('[Install Local App] Tokens salvos com sucesso.');

        const handlerUrl = `https://${req.headers.host}/api/install`;
        await registerPlacement(handlerUrl, tokens);

        console.log('[Install Local App] Instalação/Atualização concluída.');
        res.setHeader('Content-Type', 'text/html');
        // Envia script para fechar SOMENTE se for instalação inicial (DEFAULT)
        if (params.PLACEMENT === 'DEFAULT') {
            res.send('<head><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX=window.parent.BX;if(BX){BX.ready(function(){BX.SidePanel.Instance.close();})}</script></head><body>Instalado/Atualizado! Fechando...</body>');
        } else {
             res.send('Atualização Local Processada.');
        }

    } catch (error) {
        console.error('[Install Local App] ERRO:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
        res.status(500).send(`Erro durante a instalação (App Local): ${errorMessage}`);
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
            const tokenParams = {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: code
            };
            console.log(`[Install OAuth] Solicitando tokens de: ${tokenUrl}`);
            const response = await axios.post(tokenUrl, null, { params: tokenParams });
            console.log('[Install OAuth] Tokens recebidos:', response.data);

            const tokenData = response.data;
            const tokens = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_in: Math.floor(Date.now() / 1000) + tokenData.expires_in,
                domain: tokenData.domain,
                member_id: tokenData.member_id
            };

            if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) {
                throw new Error('Falha ao receber dados de token válidos do Bitrix24 via OAuth.');
            }

            await saveTokens(tokens);
            console.log('[Install OAuth] Tokens salvos para member_id:', tokens.member_id);

            const handlerUrl = `https://${req.headers.host}/api/install`;
            await registerPlacement(handlerUrl, tokens);

            console.log('[Install OAuth] Instalação concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script src="//api.bitrix24.com/api/v1/"></script><script>window.BX=window.parent.BX;if(BX){BX.ready(function(){BX.SidePanel.Instance.close();})}</script></head><body>Instalado! Fechando...</body>');
        } catch (error) {
            console.error('[Install OAuth] ERRO:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
        }
}

// ==================================================================
// Função que lida com o clique no botão (mostra seleção)
// ==================================================================
async function handlePlacementClick(req, res) {
    console.log('[Handler] Clique de botão (CRM_COMPANY_DETAIL_TOOLBAR) iniciado.');

    const memberId = req?.body?.member_id || req?.body?.auth?.member_id || req?.query?.member_id;
    if (!memberId) {
        console.error('[Handler] member_id não encontrado na requisição do placement.');
        return res.status(400).send('Erro: Identificação do membro ausente.');
    }

    const simulatedReqForTokens = {
        body: req.body,
        query: { ...req.query, member_id: memberId }
    };

    try {
        const authTokens = await getFreshTokens(simulatedReqForTokens);

        if (!authTokens) {
            console.error('[Handler] Falha ao obter/renovar tokens de autenticação.');
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos. Reinstale o aplicativo.');
        }
        console.log('[Handler] Tokens obtidos/renovados com sucesso para member_id:', authTokens.member_id);

        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
            try {
                const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
                companyId = placementOptions.ID;
                console.log('[Handler] ID da Empresa extraído de PLACEMENT_OPTIONS:', companyId);
            } catch (parseError) {
                console.error("[Handler] Erro ao parsear PLACEMENT_OPTIONS:", parseError);
                return res.status(400).send('Erro ao processar dados do placement (JSON inválido).');
            }
        }

        if (!companyId) {
            console.error("[Handler] Não foi possível encontrar o ID da Empresa em PLACEMENT_OPTIONS:", req.body);
            return res.status(400).send('ID da Empresa não encontrado na requisição do placement.');
        }

        console.log('[Handler] Exibindo tela de seleção.');
        res.setHeader('Content-Type', 'text/html');
        res.send(getSelectionHtml(companyId, authTokens.member_id));

    } catch (error) {
        console.error('[Handler] Erro detalhado no handlePlacementClick:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
        const errorStatus = error.status || 500;
        res.status(errorStatus).send(`Erro ao carregar seleção: ${errorMessage}`);
    }
}

// ==================================================================
// Função que lida com a requisição APÓS a seleção (mostra formulário)
// ==================================================================
async function handlePostSelection(req, res) {
    const authType = req.query.type;
    const companyId = req.query.companyId;
    const memberId = req.query.member_id;

    console.log(`[Handler PostSelection] Recebido type=${authType}, companyId=${companyId}, memberId=${memberId}`);

     if (!memberId) {
        console.error('[Handler PostSelection] member_id ausente na query.');
        return res.status(400).send('Erro: Identificação do membro ausente.');
    }

    const simulatedReqForTokens = {
        body: {},
        query: { ...req.query }
    };

    try {
        const authTokens = await getFreshTokens(simulatedReqForTokens);
        if (!authTokens) {
            console.error('[Handler PostSelection] Falha ao obter/renovar tokens.');
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos.');
        }

        let contratanteData = { nome: '', cpf: '', telefone: '', email: '' };

        if (companyId && authType !== 'socios_qtd') {
            console.log(`[Handler PostSelection] Buscando dados para Empresa ID: ${companyId}`);
            try {
                const company = await call('crm.company.get', { id: companyId }, authTokens);
                if (company) {
                    contratanteData.nome = company.TITLE || '';
                    contratanteData.telefone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
                    contratanteData.email = (company.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
                    contratanteData.cpf = company.UF_CRM_66C37392C9F3D || '';
                    console.log('[Handler PostSelection] Dados da empresa carregados:', contratanteData);
                } else {
                     console.warn("[Handler PostSelection] Empresa não encontrada com ID:", companyId);
                }
            } catch(companyError) {
                 console.error("[Handler PostSelection] Erro ao buscar dados da empresa:", companyError.message);
            }
        } else if (authType !== 'socios_qtd') {
            console.warn("[Handler PostSelection] companyId não fornecido na query.");
        }

        // --- ROTEAMENTO DO FORMULÁRIO ---
        res.setHeader('Content-Type', 'text/html');

        if (authType === 'solteiro' || authType === 'casado') {
            console.log(`[Handler PostSelection] Exibindo formulário para ${authType}.`);
            res.send(getFormHtml(authType, contratanteData));

        } else if (authType === 'socios_qtd') {
             console.log('[Handler PostSelection] Exibindo formulário para quantidade de sócios.');
             res.send(getSociosQtdHtml(companyId, authTokens.member_id));

        } else if (authType === 'socios_form' && req.query.qtd) {
             const numSocios = parseInt(req.query.qtd, 10);
             if (isNaN(numSocios) || numSocios < 2) {
                 return res.status(400).send('Quantidade de sócios inválida.');
             }
             console.log(`[Handler PostSelection] Exibindo formulário para ${numSocios} sócios.`);
             res.send(getFormHtml('socios', contratanteData, numSocios));

        } else {
            console.warn('[Handler PostSelection] Tipo inválido:', authType);
            res.status(400).send('Tipo de autorização inválido.');
        }

    } catch (error) {
        console.error('[Handler PostSelection] Erro geral:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
        res.status(500).send(`Erro: ${errorMessage}`);
    }
}

// ==================================================================
// FUNÇÕES AUXILIARES DE HTML
// ==================================================================

// HTML da tela de seleção inicial
function getSelectionHtml(companyId, memberId) {
    // APONTA PARA SI MESMO (/api/install) com o parâmetro 'type'
    const buildUrl = (type) => `/api/install?type=${type}${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;

    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Selecionar Tipo de Autorização</title>
             <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
                .container { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%;}
                h2 { color: #333; margin-top: 0; margin-bottom: 25px; font-size: 1.3em;}
                a { display: block; background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; text-decoration: none; margin-bottom: 15px; font-weight: bold; transition: background-color 0.2s; }
                a:hover { background-color: #0056b3; }
                a.secondary { background-color: #6c757d; }
                a.secondary:hover { background-color: #5a6268; }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Selecione o Tipo de Autorização de Venda</h2>
                <a href="${buildUrl('solteiro')}">Solteiro / Viúvo</a>
                <a href="${buildUrl('casado')}">Casado / União Estável</a>
                <a href="${buildUrl('socios_qtd')}" class="secondary">Imóvel de Sócios</a>
            </div>
             <script src="//api.bitrix24.com/api/v1/"></script>
             <script>
                 if (window.BX) { BX.ready(function() { BX.resizeWindow(600, 400); BX.setTitle('Selecionar Tipo'); }); }
             </script>
        </body>
        </html>
    `;
}

// HTML para perguntar a quantidade de sócios
function getSociosQtdHtml(companyId, memberId) {
     // APONTA PARA SI MESMO (/api/install) com type=socios_form
     const formAction = `/api/install?type=socios_form${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;
     return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Quantidade de Sócios</title>
             <style>
                 body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 90vh; }
                .container { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%;}
                h2 { color: #333; margin-top: 0; margin-bottom: 25px; font-size: 1.3em;}
                label { display: block; margin-bottom: 10px; font-weight: 600; color: #555; }
                input[type="number"] { width: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; margin-bottom: 20px; text-align: center; }
                button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; transition: background-color 0.2s; }
                button:hover { background-color: #0056b3; }
             </style>
        </head>
         <body>
            <div class="container">
                <h2>Imóvel de Sócios</h2>
                 <form action="${formAction}" method="GET">
                     <label for="qtd">Quantos sócios são proprietários?</label>
                     <input type="number" id="qtd" name="qtd" min="2" value="2" required>
                     <button type="submit">Continuar</button>
                 </form>
             </div>
              <script src="//api.bitrix24.com/api/v1/"></script>
              <script>
                   if (window.BX) { BX.ready(function() { BX.resizeWindow(600, 400); BX.setTitle('Qtd Sócios'); }); }
             </script>
         </body>
        </html>
     `;
}


// HTML principal do formulário (com <select> e lógica condicional)
function getFormHtml(type, contratanteData, numSocios = 1) {
    let contratanteHtml = '';

    // Opções de Estado Civil
    const estadoCivilSolteiroOptions = `
        <option value="Solteiro(a)">Solteiro(a)</option>
        <option value="Divorciado(a)">Divorciado(a)</option>
        <option value="Viúvo(a)">Viúvo(a)</option>
    `;
    const estadoCivilCasadoOptions = `
        <option value="Casado(a)">Casado(a)</option>
        <option value="União Estável">União Estável</option>
    `;
    const regimeCasamentoOptions = `
        <option value="Comunhão Parcial de Bens">Comunhão Parcial de Bens</option>
        <option value="Comunhão Universal de Bens">Comunhão Universal de Bens</option>
        <option value="Separação Total de Bens">Separação Total de Bens</option>
        <option value="Participação Final nos Aquestos">Participação Final nos Aquestos</option>
        <option value="Outro">Outro</option>
    `;

    // Gera os blocos de contratante/sócio
    for (let i = 0; i < numSocios; i++) {
        const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
        const titulo = numSocios > 1 ? `SÓCIO ${i+1}` : 'CONTRATANTE';
        const nome = (i === 0) ? contratanteData.nome : '';
        const cpf = (i === 0) ? contratanteData.cpf : '';
        const telefone = (i === 0) ? contratanteData.telefone : '';
        const email = (i === 0) ? contratanteData.email : '';

        const estadoCivilOptions = (type === 'casado' && numSocios === 1) ? estadoCivilCasadoOptions : estadoCivilSolteiroOptions + estadoCivilCasadoOptions;

        contratanteHtml += `
            <div class="form-section">
                <h3>${titulo}</h3>
                <div class="form-grid">
                    <div>
                        <label>Nome:</label>
                        <input type="text" name="${prefix}Nome" value="${nome}">
                    </div>
                    <div>
                        <label>CPF:</label>
                        <input type="text" name="${prefix}Cpf" value="${cpf}">
                    </div>
                    <div>
                        <label>RG nº:</label>
                        <input type="text" name="${prefix}Rg" placeholder="Ex: 9.999.999">
                    </div>
                    <div>
                        <label>Profissão:</label>
                        <input type="text" name="${prefix}Profissao">
                    </div>
                    <div>
                        <label>Estado Civil:</label>
                        <select name="${prefix}EstadoCivil" id="${prefix}EstadoCivil" onchange="toggleRegime('${prefix}')">
                            <option value="">Selecione...</option>
                            ${estadoCivilOptions}
                        </select>
                    </div>
                    <div id="${prefix}RegimeDiv" style="display: none;"> {/* Oculto por padrão */}
                        <label>Regime de Casamento:</label>
                         <select name="${prefix}RegimeCasamento">
                            <option value="">Selecione...</option>
                            ${regimeCasamentoOptions}
                        </select>
                    </div>
                    <div class="grid-col-span-3">
                        <label>Endereço Residencial:</label>
                        <input type="text" name="${prefix}Endereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                    </div>
                    <div>
                        <label>Telefone/Celular:</label>
                        <input type="text" name="${prefix}Telefone" value="${telefone}">
                    </div>
                    <div class="grid-col-span-2">
                        <label>E-mail:</label>
                        <input type="email" name="${prefix}Email" value="${email}">
                    </div>
                </div>
            </div>
        `;
    }

    // Adiciona campos do cônjuge se for tipo 'casado'
    const conjugeHtml = type === 'casado' ? `
        <div class="form-section">
            <h3>CÔNJUGE</h3>
             <div class="form-grid">
                <div>
                    <label>Nome:</label>
                    <input type="text" name="conjugeNome">
                </div>
                <div>
                    <label>CPF:</label>
                    <input type="text" name="conjugeCpf">
                </div>
                <div>
                    <label>RG nº:</label>
                    <input type="text" name="conjugeRg" placeholder="Ex: 9.999.999">
                </div>
                 <div>
                    <label>Profissão:</label>
                    <input type="text" name="conjugeProfissao">
                </div>
                 <div class="grid-col-span-2">
                     {/* Espaço vazio para alinhar */}
                    </div>
             </div>
        </div>
    ` : '';

    // Formulário completo
    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Gerar Autorização</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; }
                h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                form { max-width: 800px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                .form-section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
                 .form-section:last-of-type { border-bottom: none; }
                h3 { color: #0056b3; margin-top: 0; margin-bottom: 15px; font-size: 1.1em; border-left: 3px solid #007bff; padding-left: 8px;}
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; align-items: start; }
                div { margin-bottom: 0; }
                label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 13px; }
                input[type="text"], input[type="number"], input[type="email"], select {
                    width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px; box-sizing: border-box; height: 38px;
                }
                input:focus, select:focus { border-color: #007bff; outline: none; box-shadow: 0 0 0 2px rgba(0,123,255,.25); }
                .grid-col-span-2 { grid-column: span 2; }
                .grid-col-span-3 { grid-column: 1 / -1; }

                button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; transition: background-color 0.2s; }
                button:hover { background-color: #0056b3; }
                 .button-container { text-align: center; margin-top: 20px; }

                @media (max-width: 600px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .grid-col-span-2 { grid-column: span 1; }
                }
            </style>
        </head>
        <body>

            <form action="/api/generate-pdf" method="POST" target="_blank">
                 <h2>Gerar Autorização de Venda</h2>
                 <p>Confira os dados pré-preenchidos (eles são editáveis) e preencha os campos manuais.</p>

                <input type="hidden" name="authType" value="${type}">
                ${numSocios > 1 ? `<input type="hidden" name="numSocios" value="${numSocios}">` : ''}

                ${contratanteHtml}
                ${conjugeHtml}

                 <div class="form-section">
                    <h3>IMÓVEL</h3>
                    <div class="form-grid">
                        <div class="grid-col-span-3"> <label>Imóvel (Descrição):</label> <input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol"> </div>
                        <div class="grid-col-span-3"> <label>Endereço do Imóvel:</label> <input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC"> </div>
                        <div class="grid-col-span-2"> <label>Inscrição Imobiliária/Matrícula:</label> <input type="text" name="imovelMatricula" placeholder="Nº da matrícula"> </div>
                        <div> <label>Valor do Imóvel (R$):</label> <input type="number" name="imovelValor" step="0.01" placeholder="500000.00"> </div>
                        <div class="grid-col-span-2"> <label>Administradora de Condomínio:</label> <input type="text" name="imovelAdminCondominio"> </div>
                        <div> <label>Valor Condomínio (R$):</label> <input type="number" name="imovelValorCondominio" step="0.01" placeholder="350.00"> </div>
                        <div> <label>Chamada de Capital:</label> <input type="text" name="imovelChamadaCapital" placeholder="Ex: R$ 100,00"> </div>
                        <div class="grid-col-span-2"> <label>Nº de parcelas (Chamada Capital):</label> <input type="number" name="imovelNumParcelas"> </div>
                    </div>
                </div>

                <div class="form-section">
                    <h3>CONTRATO</h3>
                    <div class="form-grid">
                        <div> <label>Prazo de exclusividade (dias):</label> <input type="number" name="contratoPrazo" value="90" required> </div>
                        <div> <label>Comissão (%):</label> <input type="number" name="contratoComissaoPct" value="6" step="0.1" required> </div>
                    </div>
                </div>

                <div class="button-container"> <button type="submit">Gerar PDF</button> </div>
            </form>

             <script src="//api.bitrix24.com/api/v1/"></script>
             <script>
                  // Função para mostrar/ocultar Regime de Casamento
                  function toggleRegime(prefix) {
                      const estadoCivilSelect = document.getElementById(prefix + 'EstadoCivil');
                      const regimeDiv = document.getElementById(prefix + 'RegimeDiv');
                      if (estadoCivilSelect && regimeDiv) {
                          const selectedValue = estadoCivilSelect.value;
                          if (selectedValue === 'Casado(a)' || selectedValue === 'União Estável') {
                              regimeDiv.style.display = 'block';
                          } else {
                              regimeDiv.style.display = 'none';
                              // Limpa o valor do regime se não for aplicável
                              const regimeSelect = regimeDiv.querySelector('select');
                              if(regimeSelect) regimeSelect.value = '';
                          }
                      }
                  }

                  document.addEventListener('DOMContentLoaded', function() {
                      const numSociosJS = ${numSocios};
                      for (let i = 0; i < numSociosJS; i++) {
                          const prefixJS = numSociosJS > 1 ? \`socio\${i+1}\` : 'contratante';
                          toggleRegime(prefixJS); // Chama para definir estado inicial
                      }
                       if (window.BX) { BX.ready(function() { BX.resizeWindow(window.innerWidth > 850 ? 850 : window.innerWidth, 700); BX.setTitle('Gerar Autorização'); }); }
                  });
             </script>
        </body>
        </html>
    `;
}

// ==================================================================
// Função auxiliar para registrar/atualizar o placement (Botão)
// ==================================================================
async function registerPlacement(handlerUrl, tokens) {
    if (!tokens || !tokens.access_token) {
        console.error('[Install Register] Tokens inválidos.');
        throw new Error('Tokens inválidos para registrar placement.');
    }
    console.log(`[Install Register] Registrando/Atualizando placement para: ${handlerUrl}`);

    const placementCode = 'CRM_COMPANY_DETAIL_TOOLBAR';
    const placementTitle = 'Gerar Autorização PDF';
    const placementDescription = 'Gera PDF de autorização de vendas';

    console.log(`[Install Register] Limpando (${placementCode})...`);
    try {
        await call('placement.unbind', { PLACEMENT: placementCode, HANDLER: handlerUrl }, tokens);
        console.log('[Install Register] Unbind ok.');
    } catch (unbindError) {
        const errorCode = unbindError.details?.code || unbindError.details?.error;
        if (errorCode !== 'PLACEMENT_HANDLER_NOT_FOUND' && errorCode !== 'ERROR_PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro unbind:", unbindError.message);
        } else {
           console.log("[Install Register] Handler antigo não encontrado (ok).");
        }
    }

    console.log(`[Install Register] Registrando (${placementCode})...`);
    await call('placement.bind', {
        PLACEMENT: placementCode,
        HANDLER: handlerUrl,
        TITLE: placementTitle,
        DESCRIPTION: placementDescription
    }, tokens);
    console.log('[Install Register] Botão registrado.');
}