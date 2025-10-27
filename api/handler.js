import { call } from '../utils/b24.js';

export default async function handler(req, res) {
    try {
        // 1. Pega o ID da Empresa
        const placementOptions = JSON.parse(req.body.PLACEMENT_OPTIONS);
        const companyId = placementOptions.ID;

        // 2. Busca os dados da Empresa
        const response = await call('crm.company.get', { id: companyId });
        const company = response.result;
        
        // --- Dados Automáticos ---
        const companyName = company.TITLE || '';
        const companyPhone = (company.PHONE && company.PHONE.length > 0) ? company.PHONE[0].VALUE : '';
        
        // !!! IMPORTANTE !!!
        // Troque 'UF_CRM_XXXXXX' pelo ID real do seu campo customizado de CNPJ/CPF no Bitrix2422
        const companyCnpj = company.UF_CRM_66C37392C9F3D || ''; 

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
                    form { max-width: 700px; margin: 0 auto; background: #fff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                    div { margin-bottom: 16px; }
                    label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; }
                    input[type="text"], input[type="number"], textarea {
                        width: 98%; padding: 10px; border: 1px solid #ccc; border-radius: 5px; font-size: 14px;
                    }
                    input[readonly] { background-color: #eee; cursor: not-allowed; }
                    button { background-color: #007bff; color: white; padding: 12px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px; font-weight: bold; }
                    button:hover { background-color: #0056b3; }
                    hr { border: none; border-top: 1px solid #eee; margin: 25px 0; }
                </style>
            </head>
            <body>
                <h2>Gerar Autorização de Venda</h2>
                <p>Preencha os dados manuais para gerar o documento.</p>

                <form action="/api/generate-pdf" method="POST" target="_blank">
                    
                    <h3>Dados do Proprietário (Automático)</h3>
                    <div>
                        <label>Nome / Razão Social:</label>
                        <input type="text" name="proprietarioNome" value="${companyName}" readonly>
                    </div>
                    <div>
                        <label>CPF / CNPJ:</label>
                        <input type="text" name="proprietarioDoc" value="${companyCnpj}" readonly>
                    </div>
                    <div>
                        <label>Telefone:</label>
                        <input type="text" name="proprietarioTelefone" value="${companyPhone}" readonly>
                    </div>

                    <hr>

                    <h3>Dados do Imóvel & Contrato (Manual)</h3>
                    <div>
                        <label for="imovelEndereco">Endereço Completo do Imóvel:</label>
                        <input type="text" id="imovelEndereco" name="imovelEndereco" placeholder="Ex: Rua, 123, Bairro, Cidade - SC" required>
                    </div>
                    <div>
                        <label for="imovelMatricula">Matrícula do Imóvel:</label>
                        <input type="text" id="imovelMatricula" name="imovelMatricula" placeholder="Nº da matrícula no Registro de Imóveis">
                    </div>
                    <div>
                        <label for="valorVenda">Valor de Venda (R$):</label>
                        <input type="number" id="valorVenda" name="valorVenda" step="0.01" required>
                    </div>
                    <div>
                        <label for="comissaoPct">Comissão (%):</label>
                        <input type="number" id="comissaoPct" name="comissaoPct" step="0.1" value="6" required>
                    </div>
                    <div>
                        <label for="prazoDias">Prazo de Validade (dias):</label>
                        <input type="number" id="prazoDias" name="prazoDias" value="90" required>
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