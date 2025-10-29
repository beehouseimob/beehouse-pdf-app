// /api/install.js
import axios from 'axios';
import { saveTokens, call, getFreshTokens } from '../utils/b24.js';

const CLIENT_ID = process.env.B_CLIENT_ID; // Corrigido para corresponder ao seu .env anterior
const CLIENT_SECRET = process.env.B_CLIENT_SECRET; // Corrigido para corresponder ao seu .env anterior

export default async function handler(req, res) {
    const params = { ...req.query, ...req.body };
    console.log('[Install/Router] Requisição recebida...');
    console.log('[Install/Router] Query Params:', req.query);
    console.log('[Install/Router] Body Params:', req.body);

    const domain = params.domain || params.DOMAIN;
    const memberId = params.member_id || params.MEMBER_ID;
    const placement = params.PLACEMENT;

    // --- ROTEAMENTO CORRIGIDO ---

    // PRIORIDADE 1: Fluxo OAuth padrão (code na query)
    if (params.code && domain && memberId && !params.AUTH_ID) {
        console.log('[Install] Detectado fluxo OAuth (code).');
        try {
            const tokenUrl = `https://${domain}/oauth/token/`;
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
                // expires_in é timestamp UNIX de expiração
                expires_in: Math.floor(Date.now() / 1000) + tokenData.expires_in, 
                domain: tokenData.domain,
                member_id: tokenData.member_id
            };

            if (!tokens.access_token || !tokens.refresh_token || !tokens.domain || !tokens.member_id) {
                throw new Error('Falha ao receber dados de token válidos do Bitrix24 via OAuth.');
            }

            await saveTokens(tokens);
            console.log('[Install OAuth] Tokens salvos para member_id:', tokens.member_id);

            const handlerUrl = `https://${req.headers.host}/api/install`; // Handler principal
            await registerPlacement(handlerUrl, tokens); 

            console.log('[Install OAuth] Instalação concluída.');
            res.setHeader('Content-Type', 'text/html');
            res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado com sucesso (OAuth)! Feche esta janela.</body>');
        } catch (error) {
            console.error('[Install OAuth] ERRO DURANTE O FLUXO OAUTH:', error.response?.data || error.message || error);
            const errorMessage = error.response?.data?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (OAuth): ${errorMessage}`);
        }
    }
    // PRIORIDADE 2: Fluxo de App Local (AUTH_ID no body - pode vir com PLACEMENT: 'DEFAULT')
    else if (params.AUTH_ID && memberId && domain) {
        console.log('[Install] Detectado fluxo de App Local (AUTH_ID). Placement:', placement);
        try {
            const tokens = {
                access_token: params.AUTH_ID,
                refresh_token: params.REFRESH_ID,
                // expires_in é timestamp UNIX de expiração
                expires_in: params.AUTH_EXPIRES ? Math.floor(Date.now() / 1000) + parseInt(params.AUTH_EXPIRES, 10) : Math.floor(Date.now() / 1000) + 3600,
                domain: domain,
                member_id: memberId 
            };

            if (!tokens.access_token) {
                throw new Error('access_token ausente no fluxo de App Local.');
            }

            console.log('[Install Local App] Salvando tokens para member_id:', tokens.member_id);
            await saveTokens(tokens); 
            console.log('[Install Local App] Tokens salvos com sucesso.');

            // Registra/atualiza o botão (placement) APÓS salvar os tokens
            const handlerUrl = `https://${req.headers.host}/api/install`; // Handler principal
            await registerPlacement(handlerUrl, tokens);

            console.log('[Install Local App] Instalação/Atualização concluída.');
            res.setHeader('Content-Type', 'text/html');
            // Fechar a janela SÓ SE for o placement 'DEFAULT' (instalação), não no clique do botão
             if (placement === 'DEFAULT') {
                 res.send('<head><script>top.BX.closeApplication();</script></head><body>Instalado/Atualizado com sucesso (App Local)!</body>');
             } else {
                 // Se por algum motivo chegou aqui sem ser DEFAULT (improvável com a nova lógica),
                 // apenas confirma que rodou.
                 res.send('Processado (App Local, non-default)');
             }
        } catch (error) {
            console.error('[Install Local App] ERRO DURANTE O FLUXO:', error.response?.data || error.details || error.message || error);
            const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido';
            res.status(500).send(`Erro durante a instalação (App Local): ${errorMessage}`);
        }
    }
    // PRIORIDADE 3: Clique no botão (PLACEMENT específico)
    else if (placement && placement === 'CRM_COMPANY_DETAIL_TOOLBAR') {
        console.log('[Router] Detectado clique no botão CRM_COMPANY_DETAIL_TOOLBAR.');
        // Chama a função que lida com o clique do botão (antigo /api/handler)
        await handlePlacementClick(req, res); 
    }
     // PRIORIDADE 4: Chamada inicial de verificação (APP_SID na query)
    else if (req.query.APP_SID && !params.AUTH_ID && !params.code && !placement) {
        console.log('[Install] Detectada chamada inicial de verificação (APP_SID).');
        res.status(200).send('Endpoint de instalação acessível.');
    }
    // FLUXO NÃO RECONHECIDO
    else {
        console.warn('[Install] Parâmetros não correspondem a OAuth, App Local, Clique de Botão ou Verificação Inicial.', params);
        res.status(400).send('Tipo de requisição não reconhecida.');
    }
}

// ==================================================================
// Função que lida com o clique no botão (era o antigo /api/handler.js)
// ==================================================================
async function handlePlacementClick(req, res) {
    console.log('[Handler] Clique de botão (CRM_COMPANY_DETAIL_TOOLBAR) iniciado.');
    // Nota: req.body já está mesclado com req.query no início do handler principal

    try {
        // 1. Obtém tokens frescos (getFreshTokens extrai member_id)
        const authTokens = await getFreshTokens(req); 

        if (!authTokens) {
            console.error('[Handler] Falha ao obter/renovar tokens de autenticação.');
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos. Reinstale o aplicativo.');
        }
        console.log('[Handler] Tokens obtidos/renovados com sucesso para member_id:', authTokens.member_id);

        // 2. Pega o ID da Empresa do PLACEMENT_OPTIONS
        let companyId;
        if (req.body.PLACEMENT_OPTIONS) {
            try {
                const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
                companyId = placementOptions.ID; 
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

        // 3. Busca os dados da Empresa (se necessário - para pré-preencher)
        // Você pode decidir buscar os dados aqui ou deixar a próxima etapa fazer isso
        
        // 4. Exibe a tela de SELEÇÃO, passando companyId e member_id
        console.log('[Handler] Exibindo tela de seleção.');
        res.setHeader('Content-Type', 'text/html');
        // Chama a função que gera o HTML da tela de seleção
        res.send(getSelectionHtml(companyId, authTokens.member_id)); 

    } catch (error) {
        console.error('[Handler] Erro detalhado no handlePlacementClick:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido ao processar clique do botão';
        const errorStatus = error.status || 500;
        res.status(errorStatus).send(`Erro ao carregar formulário: ${errorMessage}`);
    }
}

// ==================================================================
// FUNÇÕES AUXILIARES DE HTML (Movidas de /api/handler.js)
// ==================================================================

// HTML da tela de seleção inicial
function getSelectionHtml(companyId, memberId) {
    // Constrói os links mantendo companyId e memberId
    // APONTA PARA SI MESMO (/api/install) com o parâmetro 'type'
    const buildUrl = (type) => `/api/install?type=${type}${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;
    
    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Selecionar Tipo de Autorização</title>
             <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 90vh; /* Ajustado para evitar barra de rolagem se possível */ }
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
                 // Se esta janela foi aberta pelo placement, ajusta o título
                 if (window.BX) {
                     BX.ready(function() {
                         BX.resizeWindow(600, 400); // Ajusta tamanho da janela
                         BX.setTitle('Selecionar Tipo de Autorização'); 
                     });
                 }
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
                     <label for="qtd">Quantos sócios são proprietários do imóvel?</label>
                     <input type="number" id="qtd" name="qtd" min="2" value="2" required>
                     <button type="submit">Continuar</button>
                 </form>
             </div>
              <script src="//api.bitrix24.com/api/v1/"></script>
             <script>
                 if (window.BX) {
                     BX.ready(function() {
                         BX.resizeWindow(600, 400); // Ajusta tamanho da janela
                         BX.setTitle('Quantidade de Sócios'); 
                     });
                 }
             </script>
         </body>
        </html>
     `;
}


// HTML principal do formulário (adaptado para os tipos)
function getFormHtml(type, contratanteData, numSocios = 1) {
    let contratanteHtml = '';

    // Gera os blocos de contratante/sócio
    for (let i = 0; i < numSocios; i++) {
        const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
        const titulo = numSocios > 1 ? `SÓCIO ${i+1}` : 'CONTRATANTE';
        const nome = (i === 0) ? contratanteData.nome : '';
        const cpf = (i === 0) ? contratanteData.cpf : '';
        const telefone = (i === 0) ? contratanteData.telefone : '';
        const email = (i === 0) ? contratanteData.email : '';
        
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
                        <input type="text" name="${prefix}EstadoCivil">
                    </div>
                    <div>
                        <label>Regime de Casamento:</label>
                        <input type="text" name="${prefix}RegimeCasamento" placeholder="Se aplicável">
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
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
                div { margin-bottom: 0; }
                label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 13px; }
                input[type="text"], input[type="number"], input[type="email"], select {
                    width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px; box-sizing: border-box;
                }
                input:focus { border-color: #007bff; outline: none; box-shadow: 0 0 0 2px rgba(0,123,255,.25); }
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

                <div class="button-container">
                    <button type="submit">Gerar PDF</button>
                </div>
            </form>
             <script src="//api.bitrix24.com/api/v1/"></script>
             <script>
                  if (window.BX) {
                     BX.ready(function() {
                         // Tenta redimensionar a janela para acomodar formulários maiores
                         BX.resizeWindow(window.innerWidth > 850 ? 850 : window.innerWidth, 700); 
                         BX.setTitle('Gerar Autorização de Venda'); 
                     });
                 }
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
        console.error('[Install Register] Tentativa de registrar placement sem tokens válidos.');
        throw new Error('Tokens inválidos ou ausentes para registrar o placement.');
    }
    console.log(`[Install Register] Registrando/Atualizando placement para: ${handlerUrl}`);

    const placementCode = 'CRM_COMPANY_DETAIL_TOOLBAR'; // Código do botão
    const placementTitle = 'Gerar Autorização PDF';
    const placementDescription = 'Gera PDF de autorização de vendas';

    console.log(`[Install Register] Limpando botão antigo (${placementCode})...`);
    try {
        await call('placement.unbind', {
            PLACEMENT: placementCode,
            HANDLER: handlerUrl
        }, tokens); 
        console.log('[Install Register] Unbind (limpeza) concluído.');
    } catch (unbindError) {
        const errorCode = unbindError.details?.code || unbindError.details?.error;
        // Ignora apenas o erro específico de não encontrar o handler antigo
        if (errorCode !== 'PLACEMENT_HANDLER_NOT_FOUND' && errorCode !== 'ERROR_PLACEMENT_HANDLER_NOT_FOUND') {
           console.warn("[Install Register] Erro durante o unbind:", unbindError.message);
           // Considera relançar o erro se for crítico
           // throw unbindError; 
        } else {
           console.log("[Install Register] Handler antigo não encontrado (ok).");
        }
    }

    console.log(`[Install Register] Registrando novo botão (${placementCode})...`);
    await call('placement.bind', {
        PLACEMENT: placementCode,
        HANDLER: handlerUrl, // O handler principal agora lida com cliques
        TITLE: placementTitle,
        DESCRIPTION: placementDescription
    }, tokens); 
    console.log('[Install Register] Botão registrado com sucesso.');
}