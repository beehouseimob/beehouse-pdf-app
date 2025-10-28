// /api/install.js
import axios from 'axios';
// Importa as funções corretas do b24.js
import { saveTokens, call, getFreshTokens } from '../utils/b24.js';

// Pega credenciais do ambiente Vercel
const CLIENT_ID = process.env.B24_CLIENT_ID;
const CLIENT_SECRET = process.env.B24_CLIENT_SECRET;

export default async function handler(req, res) {
    // Unifica parâmetros de query e body, dando prioridade ao body.
    const params = { ...req.query, ...req.body };

    // --- ROTEAMENTO: É um clique de botão (placement) ou uma instalação? ---
    // A requisição de um placement SEMPRE terá o parâmetro PLACEMENT no corpo.
    if (params.PLACEMENT) {
        console.log('[Router] Detectado clique de placement:', params.PLACEMENT);
        return handlePlacementClick(req, res);
    }

    console.log('[Install/Router] Requisição de instalação/verificação recebida...');
    console.log('[Install/Router] Query Params:', req.query);
    console.log('[Install/Router] Body Params:', req.body);
 
    const domain = params.domain || params.DOMAIN;
    const memberId = params.member_id || params.MEMBER_ID;
 
    // --- PRIORIDADE 1: Fluxo de App Local (AUTH_ID no body) ---
    if (params.AUTH_ID && memberId && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID e member_id presentes).');
        try {
            const tokens = {
                access_token: params.AUTH_ID,
                refresh_token: params.REFRESH_ID,
                expires_in: params.AUTH_EXPIRES ? Math.floor(Date.now() / 1000) + parseInt(params.AUTH_EXPIRES, 10) : Math.floor(Date.now() / 1000) + 3600,
                domain: domain,
                member_id: memberId // Essencial para salvar no KV
            };

            if (!tokens.access_token) {
                throw new Error('access_token ausente no fluxo de App Local.');
            }

            console.log('[Install Local App] Salvando tokens para member_id:', tokens.member_id);
            await saveTokens(tokens); // Salva usando member_id como chave
            console.log('[Install Local App] Tokens salvos com sucesso.');

            // Registra/atualiza o botão (placement), apontando para si mesmo
            const handlerUrl = `https://${req.headers.host}/api/install`;
            await registerPlacement(handlerUrl, tokens); // Passa os tokens para autenticar a chamada

            console.log('[Install Local App] Instalação/Atualização concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado/Atualizado com sucesso (App Local)!</body>');
            return;

        } catch (error) {
            console.error('[Install Local App] ERRO DURANTE O FLUXO:', error.response?.data || error.details || error.message || error);
            const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (App Local): ${errorMessage}`);
            return;
        }
    }

    // --- PRIORIDADE 2: Fluxo OAuth padrão (code na query) ---
    else if (params.code && params.domain && params.member_id && !req.body.AUTH_ID) {
        console.log('[Install] Detectado fluxo OAuth (parâmetro code presente na query).');
        try {
            const tokenUrl = `https://${params.domain}/oauth/token/`;
            const tokenParams = {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                code: params.code
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

            await saveTokens(tokens); // Salva usando member_id como chave
            console.log('[Install OAuth] Tokens salvos com sucesso para member_id:', tokens.member_id);

            const handlerUrl = `https://${req.headers.host}/api/install`; // Aponta para si mesmo
            await registerPlacement(handlerUrl, tokens); // Passa os tokens para autenticar a chamada

            console.log('[Install OAuth] Instalação concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso (OAuth)! Feche esta janela.</body>');
            return;

        } catch (error) {
            console.error('[Install OAuth] ERRO DURANTE O FLUXO OAUTH:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
            return;
        }
    }

    // --- PRIORIDADE 3: Chamada inicial de verificação (APP_SID na query) ---
    else if (req.query.APP_SID && !params.AUTH_ID && !params.code) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID presente, sem code/AUTH_ID). Respondendo 200 OK.');
        res.status(200).send('Endpoint de instalação acessível.');
        return;
    }

    // --- FLUXO NÃO RECONHECIDO ---
    else {
        console.warn('[Install] Parâmetros não correspondem a App Local, OAuth nem chamada inicial. Respondendo 200 OK por segurança.', params);
        res.status(200).send('Recebido. Tipo de requisição não processada.');
        return;
    }
}

// ==================================================================
// NOVA FUNÇÃO - LÓGICA MOVIDA DO ANTIGO /api/handler.js
// ==================================================================
async function handlePlacementClick(req, res) {
    console.log('[Handler] Clique de botão detectado.');
    // console.log('[Handler] Request Body:', req.body); // Descomente para depurar

    try {
        // 1. Obtém tokens frescos (busca no KV e renova se necessário)
        const authTokens = await getFreshTokens(req);

        if (!authTokens) {
            console.error('[Handler] Falha ao obter/renovar tokens de autenticação.');
            const memberId = req?.body?.member_id || req?.body?.auth?.member_id;
            console.error(`[Handler] Member ID (se disponível): ${memberId}`);
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos. Reinstale o aplicativo.');
        }
        console.log('[Handler] Tokens obtidos/renovados com sucesso para member_id:', authTokens.member_id);

        // 2. Pega o ID da Empresa do PLACEMENT_OPTIONS
        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
            try {
                const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
                companyId = placementOptions.ID; // ID da Empresa
                console.log('[Handler] ID da Empresa extraído de PLACEMENT_OPTIONS:', companyId);
            } catch (parseError) {
                console.error("[Handler] Erro ao parsear PLACEMENT_OPTIONS:", parseError, "Conteúdo:", req.body.PLACEMENT_OPTIONS);
                return res.status(400).send('Erro ao processar dados do placement (JSON inválido).');
            }
        }

        if (!companyId) {
            console.error("[Handler] Não foi possível encontrar o ID da Empresa em PLACEMENT_OPTIONS:", req.body);
            return res.status(400).send('ID da Empresa não encontrado na requisição do placement.');
        }

        // 3. Busca os dados da Empresa usando a API e os tokens obtidos
        console.log(`[Handler] Buscando dados para Empresa ID: ${companyId}`);
        const company = await call('crm.company.get', { id: companyId }, authTokens); 

        let proprietarioNome = '';
        let proprietarioTelefone = '';
        let proprietarioEmail = '';
        let proprietarioCpf = '';

        if (!company) {
            console.warn("[Handler] Não foram encontrados dados para a empresa com ID:", companyId);
        } else {
            console.log('[Handler] Dados da empresa recebidos:', company);
            proprietarioNome = company.TITLE || '';
            proprietarioTelefone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
            proprietarioEmail = (company.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
            proprietarioCpf = company.UF_CRM_66C37392C9F3D || '';
        }

        // 4. Envia o Formulário HTML como resposta
        console.log('[Handler] Enviando formulário HTML.');
        res.setHeader('Content-Type', 'text/html');
        res.send(`
            <!DOCTYPE html>
            <html lang="pt-br">
            <head>
                <meta charset="UTF-8">
                <title>Gerar Autorização</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; }
                    h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    form { max-width: 800px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                    .form-section { margin-bottom: 25px; border-bottom: 1px solid #f0f0f0; padding-bottom: 20px; }
                    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
                    div { margin-bottom: 0; }
                    label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 13px; }
                    input[type="text"], input[type="number"], input[type="email"], select {
                        width: 100%;
                        padding: 10px; 
                        border: 1px solid #ccc; 
                        border-radius: 5px; 
                        font-size: 14px;
                        box-sizing: border-box;
                    }
                    .grid-col-span-2 { grid-column: span 2; }
                    .grid-col-span-3 { grid-column: 1 / -1; }
                    
                    button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
                    button:hover { background-color: #0056b3; }

                    @media (max-width: 600px) {
                        .form-grid { grid-template-columns: 1fr; }
                        .grid-col-span-2 { grid-column: span 1; }
                    }
                </style>
            </head>
            <body>
                <h2>Gerar Autorização de Venda</h2>
                <p>Confira os dados pré-preenchidos (eles são editáveis) e preencha os campos manuais.</p>

                <form action="/api/generate-pdf" method="POST" target="_blank">
                    
                    <div class="form-section">
                        <h3>CONTRATANTE</h3>
                        <div class="form-grid">
                            <div>
                                <label>Nome:</label>
                                <input type="text" name="contratanteNome" value="${proprietarioNome}">
                            </div>
                            <div>
                                <label>CPF:</label>
                                <input type="text" name="contratanteCpf" value="${proprietarioCpf}">
                            </div>
                            <div>
                                <label>RG nº:</label>
                                <input type="text" name="contratanteRg" placeholder="Ex: 9.999.999">
                            </div>
                            <div>
                                <label>Profissão:</label>
                                <input type="text" name="contratanteProfissao">
                            </div>
                            <div>
                                <label>Estado Civil:</label>
                                <input type="text" name="contratanteEstadoCivil">
                            </div>
                            <div>
                                <label>Regime de Casamento:</label>
                                <input type="text" name="contratanteRegimeCasamento" placeholder="Se aplicável">
                            </div>
                            <div class="grid-col-span-3">
                                <label>Endereço Residencial:</label>
                                <input type="text" name="contratanteEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                            </div>
                            <div>
                                <label>Telefone/Celular:</label>
                                <input type="text" name="contratanteTelefone" value="${proprietarioTelefone}">
                            </div>
                            <div class="grid-col-span-2">
                                <label>E-mail:</label>
                                <input type="email" name="contratanteEmail" value="${proprietarioEmail}">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>IMÓVEL</h3>
                        <div class="form-grid">
                            <div class="grid-col-span-3">
                                <label>Imóvel (Descrição):</label>
                                <input type="text" name="imovelDescricao" placeholder="Ex: Apartamento 101, Edifício Sol">
                            </div>
                            <div class="grid-col-span-3">
                                <label>Endereço do Imóvel:</label>
                                <input type="text" name="imovelEndereco" placeholder="Rua, Nº, Bairro, Cidade - SC">
                            </div>
                            <div class="grid-col-span-2">
                                <label>Inscrição Imobiliária/Matrícula:</label>
                                <input type="text" name="imovelMatricula" placeholder="Nº da matrícula no Registro de Imóveis">
                            </div>
                            <div>
                                <label>Valor do Imóvel (R$):</label>
                                <input type="number" name="imovelValor" step="0.01" placeholder="500000.00">
                            </div>
                            <div class="grid-col-span-2">
                                <label>Administradora de Condomínio:</label>
                                <input type="text" name="imovelAdminCondominio" placeholder="Se aplicável">
                            </div>
                            <div>
                                <label>Valor Condomínio (R$):</label>
                                <input type="number" name="imovelValorCondominio" step="0.01" placeholder="350.00">
                            </div>
                            <div>
                                <label>Chamada de Capital:</label>
                                <input type="text" name="imovelChamadaCapital" placeholder="Ex: R$ 100,00 (se houver)">
                            </div>
                            <div class="grid-col-span-2">
                                <label>Nº de parcelas (Chamada Capital):</label>
                                <input type="number" name="imovelNumParcelas" placeholder="Se aplicável">
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3>CONTRATO</h3>
                        <div class="form-grid">
                            <div>
                                <label>Prazo de exclusividade (dias):</label>
                                <input type="number" name="contratoPrazo" value="90" required>
                            </div>
                            <div>
                                <label>Comissão (%):</label>
                                <input type="number" name="contratoComissaoPct" value="6" step="0.1" required>
                            </div>
                        </div>
                    </div>

                    <button type="submit">Gerar PDF</button>
                </form>
            </body>
            </html>
        `);

    } catch (error) {
        console.error('[Handler] Erro detalhado:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido ao processar clique do botão';
        const errorStatus = error.status || 500;
        res.status(errorStatus).send(`Erro ao carregar formulário: ${errorMessage}`);
    }
}

// Função auxiliar para registrar/atualizar o placement
async function registerPlacement(handlerUrl, tokens) {
    if (!tokens || !tokens.access_token) {
        console.error('[Install Register] Tentativa de registrar placement sem tokens válidos.');
        throw new Error('Tokens inválidos ou ausentes para registrar o placement.');
    }
    console.log(`[Install Register] Registrando/Atualizando placement para: ${handlerUrl}`);

    console.log('[Install Register] Limpando botões antigos (se existirem)...');
    try {
        // Passa os tokens como terceiro argumento para 'call'
        await call('placement.unbind', {
            PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
            HANDLER: handlerUrl
        }, tokens); 
        console.log('[Install Register] Unbind (limpeza) concluído.');
    } catch (unbindError) {
        const errorCode = unbindError.details?.code || unbindError.details?.error;
        if (errorCode !== 'PLACEMENT_HANDLER_NOT_FOUND' && errorCode !== 'ERROR_PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind (ignorado se for 'NOT_FOUND'):", unbindError.message);
        } else {
           console.log("[Install Register] Handler antigo não encontrado.");
        }
    }

    console.log('[Install Register] Registrando novo botão...');
    // Passa os tokens como terceiro argumento para 'call'
    await call('placement.bind', {
        PLACEMENT: 'CRM_COMPANY_DETAIL_TOOLBAR',
        HANDLER: handlerUrl,
        TITLE: 'Gerar Autorização PDF',
        DESCRIPTION: 'Gera PDF de autorização de vendas'
    }, tokens); 
    console.log('[Install Register] Botão registrado com sucesso.');
}
