import { call } from '../utils/b24.js';

export default async function handler(req, res) {
    try {
        // 1. Pega o ID da Empresa
        const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
        const companyId = placementOptions.ID;

        // 2. Busca os dados da Empresa
        const response = await call('crm.company.get', { id: companyId });
        const company = response.result;
        
        // --- Dados Automáticos (Pré-preenchidos e EDITÁVEIS) ---
        // Você pode buscar qualquer campo.
        
        const proprietarioNome = company.TITLE || '';
        const proprietarioTelefone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
        const proprietarioEmail = (company.EMAIL && company.EMAIL.length > 0) ? company.EMAIL[0].VALUE : '';
        const proprietarioCpf = company.UF_CRM_66C37392C9F3D || ''; // <-- TROQUE PELO ID DO SEU CAMPO DE CPF/CNPJ

        // 3. Envia o Formulário HTML como resposta
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
                    .form-section { margin-bottom: 25px; }
                    .form-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; }
                    .grid-col-span-2 { grid-column: span 2; }
                    .grid-col-span-3 { grid-column: span 3; }
                    div { margin-bottom: 12px; }
                    label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; font-size: 13px; }
                    input[type="text"], input[type="number"], input[type="email"], select {
                        width: 95%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;
                    }
                    button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
                    button:hover { background-color: #0056b3; }
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
        console.error(error);
        res.status(500).send('Erro ao carregar formulario: ' + error.message);
    }
}