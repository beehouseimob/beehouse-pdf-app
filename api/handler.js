import { call, getFreshTokens } from '../utils/b24.js';

export default async function handler(req, res) {
    console.log('[Handler] Request received.');
    console.log('[Handler] Query:', req.query);
    console.log('[Handler] Body:', req.body); // Body é usado para placement clicks

    // Verifica se é um clique de placement inicial ou uma chamada subsequente com 'type'
    const isPlacementClick = req.body && req.body.PLACEMENT;
    const authType = req.query.type;
    const memberIdFromBody = req.body?.member_id || req.body?.auth?.member_id;
    const memberIdFromQuery = req.query.member_id; // member_id pode vir na query nas chamadas subsequentes

    try {
        // Para chamadas subsequentes, precisamos garantir que temos o member_id
        if (!isPlacementClick && !memberIdFromQuery) {
            console.error('[Handler] member_id ausente na query para chamada não inicial.');
            return res.status(400).send('Erro: Identificação do membro ausente.');
        }
        
        // Simula a requisição para getFreshTokens, garantindo que member_id esteja presente
        const simulatedReqForTokens = { 
            body: req.body, 
            query: { ...req.query, member_id: memberIdFromBody || memberIdFromQuery } // Garante member_id na query
        };
        
        const authTokens = await getFreshTokens(simulatedReqForTokens);

        if (!authTokens) {
            console.error('[Handler] Falha ao obter/renovar tokens de autenticação.');
            return res.status(401).send('Erro: Falha na autenticação ou tokens inválidos. Reinstale o aplicativo.');
        }
        console.log('[Handler] Tokens obtidos/renovados com sucesso para member_id:', authTokens.member_id);

        let companyId = null;
        if (isPlacementClick && req.body.PLACEMENT_OPTIONS) {
            try {
                const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
                companyId = placementOptions.ID;
                console.log('[Handler] ID da Empresa (Placement):', companyId);
            } catch (parseError) {
                console.error("[Handler] Erro ao parsear PLACEMENT_OPTIONS:", parseError);
                // Não retorna erro fatal aqui, pode ser que companyId venha da query depois
            }
        }
        // Tenta pegar companyId da query se não veio do placement (para chamadas subsequentes)
        if (!companyId && req.query.companyId) {
             companyId = req.query.companyId;
             console.log('[Handler] ID da Empresa (Query):', companyId);
        }

        let contratanteData = {
            nome: '',
            cpf: '',
            telefone: '',
            email: ''
        };

        // Busca dados da empresa SOMENTE se companyId estiver presente
        if (companyId) {
            console.log(`[Handler] Buscando dados para Empresa ID: ${companyId}`);
            try {
                const company = await call('crm.company.get', { id: companyId }, authTokens);
                if (company) {
                    contratanteData.nome = company.TITLE || '';
                    contratanteData.telefone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
                    contratanteData.email = (company.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
                    contratanteData.cpf = company.UF_CRM_66C37392C9F3D || ''; // Campo customizado CPF
                    console.log('[Handler] Dados da empresa carregados:', contratanteData);
                } else {
                     console.warn("[Handler] Empresa não encontrada com ID:", companyId);
                }
            } catch(companyError) {
                 console.error("[Handler] Erro ao buscar dados da empresa:", companyError.message);
                 // Não retorna erro fatal, continua com dados vazios
            }
        } else if (isPlacementClick) {
             console.warn("[Handler] ID da Empresa não encontrado no clique do placement.");
             // Não retorna erro fatal, permite seleção manual
        }


        // --- ROTEAMENTO BASEADO NO PARÂMETRO 'type' ---

        if (!authType) {
            // 1. NENHUM TIPO: Mostra a tela de seleção inicial
            console.log('[Handler] Exibindo tela de seleção.');
            res.setHeader('Content-Type', 'text/html');
            res.send(getSelectionHtml(companyId, authTokens.member_id)); // Passa companyId e member_id

        } else if (authType === 'solteiro') {
            // 2. TIPO SOLTEIRO: Mostra formulário simples
            console.log('[Handler] Exibindo formulário para Solteiro/Viúvo.');
            res.setHeader('Content-Type', 'text/html');
            res.send(getFormHtml('solteiro', contratanteData));

        } else if (authType === 'casado') {
            // 3. TIPO CASADO: Mostra formulário com campos do cônjuge
            console.log('[Handler] Exibindo formulário para Casado/União Estável.');
            res.setHeader('Content-Type', 'text/html');
            res.send(getFormHtml('casado', contratanteData));
            
        } else if (authType === 'socios_qtd') {
            // 4. TIPO SÓCIOS (Passo 1): Pede a quantidade
             console.log('[Handler] Exibindo formulário para quantidade de sócios.');
             res.setHeader('Content-Type', 'text/html');
             res.send(getSociosQtdHtml(companyId, authTokens.member_id)); // Passa companyId e member_id

        } else if (authType === 'socios_form' && req.query.qtd) {
             // 5. TIPO SÓCIOS (Passo 2): Mostra o formulário com campos repetidos
             const numSocios = parseInt(req.query.qtd, 10);
             if (isNaN(numSocios) || numSocios < 1) {
                 return res.status(400).send('Quantidade de sócios inválida.');
             }
             console.log(`[Handler] Exibindo formulário para ${numSocios} sócios.`);
             res.setHeader('Content-Type', 'text/html');
             // Passa o primeiro contratante pré-preenchido, os outros ficam vazios
             res.send(getFormHtml('socios', contratanteData, numSocios)); 
        
        } else {
            // Tipo inválido
            console.warn('[Handler] Tipo de autorização inválido:', authType);
            res.status(400).send('Tipo de autorização inválido.');
        }

    } catch (error) {
        console.error('[Handler] Erro geral:', error.response?.data || error.details || error.message || error);
        const errorMessage = error.details?.error_description || error.message || 'Erro desconhecido ao processar a requisição';
        res.status(500).send(`Erro: ${errorMessage}`);
    }
}

// --- FUNÇÕES AUXILIARES PARA GERAR HTML ---

// HTML da tela de seleção inicial
function getSelectionHtml(companyId, memberId) {
    // Constrói os links mantendo companyId e memberId
    const buildUrl = (type) => `/api/handler?type=${type}${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;
    
    return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Selecionar Tipo de Autorização</title>
             <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .container { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%;}
                h2 { color: #333; margin-top: 0; margin-bottom: 25px; }
                a { display: block; background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; text-decoration: none; margin-bottom: 15px; font-weight: bold; }
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
        </body>
        </html>
    `;
}

// HTML para perguntar a quantidade de sócios
function getSociosQtdHtml(companyId, memberId) {
     const formAction = `/api/handler?type=socios_form${companyId ? '&companyId=' + companyId : ''}${memberId ? '&member_id=' + memberId : ''}`;
     return `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>Quantidade de Sócios</title>
             <style>
                 body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 0; padding: 24px; background-color: #f9f9f9; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
                .container { background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; max-width: 400px; width: 100%;}
                h2 { color: #333; margin-top: 0; margin-bottom: 25px; }
                label { display: block; margin-bottom: 10px; font-weight: 600; color: #555; }
                input[type="number"] { width: 80px; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 16px; margin-bottom: 20px; text-align: center; }
                button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
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
        // Usa os dados pré-preenchidos apenas para o primeiro sócio/contratante
        const nome = (i === 0) ? contratanteData.nome : '';
        const cpf = (i === 0) ? contratanteData.cpf : '';
        // RG e outros campos são sempre manuais por enquanto
        
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
                        <input type="text" name="${prefix}Telefone" value="${(i === 0) ? contratanteData.telefone : ''}">
                    </div>
                    <div class="grid-col-span-2">
                        <label>E-mail:</label>
                        <input type="email" name="${prefix}Email" value="${(i === 0) ? contratanteData.email : ''}">
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
        </body>
        </html>
    `;
}