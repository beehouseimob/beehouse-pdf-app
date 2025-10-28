import PDFDocument from 'pdfkit';

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function drawHeader(doc) {
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', MARGIN, MARGIN, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(2);
}

function drawSectionTitle(doc, title) {
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, doc.y, { 
        underline: true,
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(1); 
    doc.fontSize(10); 
}

function getHeight(doc, label, value, labelWidth, valueWidth) {
    const val = value || '__________';
    const safeLabel = label || '';
    const safeValue = val ? String(val) : '__________';
    const labelH = doc.font('Helvetica-Bold').heightOfString(safeLabel, { width: labelWidth });
    const valueH = doc.font('Helvetica').heightOfString(safeValue, { width: valueWidth });
    return Math.max(labelH, valueH);
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF (COM PROMISE - JÁ FUNCIONANDO)
// ==================================================================
async function generatePdfPromise(data) {
    
    return new Promise((resolve, reject) => {
        
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err) => {
            console.error('Erro no stream do PDFKit:', err);
            reject(err);
        });
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            console.log('Stream do PDF finalizado. PDF pronto.');
            resolve(pdfData); 
        });

        try {
            // ==================================================================
            // INÍCIO DA LÓGICA DE DESENHO (LAYOUT CORRIGIDO)
            // ==================================================================

            drawHeader(doc);
            
            let y = doc.y;
            let h1 = 0, h2 = 0, h3 = 0, maxH = 0; // Variáveis de altura

            // --- Posições X do Grid Rígido (3 Colunas) ---
            const c1_x = MARGIN; // Col 1 Início (50)
            const c2_x = 265;    // Col 2 Início
            const c3_x = 430;    // Col 3 Início

            // --- 2. Seção CONTRATANTE ---
            drawSectionTitle(doc, 'CONTRATANTE');
            y = doc.y;

            // --- Linha 1: Nome, CPF, RG ---
            const nome_lbl = 40, nome_val = (c2_x - c1_x) - nome_lbl - 10;
            const cpf_lbl = 30, cpf_val = (c3_x - c2_x) - cpf_lbl - 10;
            const rg_lbl = 40, rg_val = (PAGE_END - c3_x) - rg_lbl;

            h1 = getHeight(doc, 'Nome:', data.contratanteNome, nome_lbl, nome_val);
            h2 = getHeight(doc, 'CPF:', data.contratanteCpf, cpf_lbl, cpf_val);
            h3 = getHeight(doc, 'RG nº:', data.contratanteRg, rg_lbl, rg_val);
            maxH = Math.max(h1, h2, h3);

            doc.font('Helvetica-Bold').text('Nome:', c1_x, y, { width: nome_lbl });
            doc.font('Helvetica').text(data.contratanteNome || '__________', c1_x + nome_lbl, y, { width: nome_val });
            doc.font('Helvetica-Bold').text('CPF:', c2_x, y, { width: cpf_lbl });
            doc.font('Helvetica').text(data.contratanteCpf || '__________', c2_x + cpf_lbl, y, { width: cpf_val });
            doc.font('Helvetica-Bold').text('RG nº:', c3_x, y, { width: rg_lbl });
            doc.font('Helvetica').text(data.contratanteRg || '__________', c3_x + rg_lbl, y, { width: rg_val });
            y += maxH + 8; 

            // --- Linha 2: Profissão, Estado Civil, Regime ---
            const prof_lbl = 55, prof_val = (c2_x - c1_x) - prof_lbl - 10;
            const est_lbl = 65, est_val = (c3_x - c2_x) - est_lbl - 10;
            const reg_lbl = 45, reg_val = (PAGE_END - c3_x) - reg_lbl;

            h1 = getHeight(doc, 'Profissão:', data.contratanteProfissao, prof_lbl, prof_val);
            h2 = getHeight(doc, 'Estado Civil:', data.contratanteEstadoCivil, est_lbl, est_val);
            h3 = getHeight(doc, 'Regime:', data.contratanteRegimeCasamento, reg_lbl, reg_val);
            maxH = Math.max(h1, h2, h3);

            doc.font('Helvetica-Bold').text('Profissão:', c1_x, y, { width: prof_lbl });
            doc.font('Helvetica').text(data.contratanteProfissao || '__________', c1_x + prof_lbl, y, { width: prof_val });
            doc.font('Helvetica-Bold').text('Estado Civil:', c2_x, y, { width: est_lbl });
            doc.font('Helvetica').text(data.contratanteEstadoCivil || '__________', c2_x + est_lbl, y, { width: est_val });
            doc.font('Helvetica-Bold').text('Regime:', c3_x, y, { width: reg_lbl });
            doc.font('Helvetica').text(data.contratanteRegimeCasamento || '__________', c3_x + reg_lbl, y, { width: reg_val });
            y += maxH + 8;

            // --- Linha 3: Endereço (Span all columns) ---
            const end_lbl = 60, end_val = CONTENT_WIDTH - end_lbl;
            h1 = getHeight(doc, 'Endereço:', data.contratanteEndereco, end_lbl, end_val);

            doc.font('Helvetica-Bold').text('Endereço:', c1_x, y, { width: end_lbl });
            doc.font('Helvetica').text(data.contratanteEndereco || '__________', c1_x + end_lbl, y, { width: end_val });
            y += h1 + 8;

            // --- Linha 4: Telefone, E-mail (2 Colunas, 3ª vazia) ---
            const tel_lbl = 50, tel_val = (c2_x - c1_x) - tel_lbl - 10;
            const email_lbl = 40, email_val = (c3_x - c2_x) - email_lbl - 10;
            
            h1 = getHeight(doc, 'Telefone:', data.contratanteTelefone, tel_lbl, tel_val);
            h2 = getHeight(doc, 'E-mail:', data.contratanteEmail, email_lbl, email_val);
            maxH = Math.max(h1, h2);

            doc.font('Helvetica-Bold').text('Telefone:', c1_x, y, { width: tel_lbl });
            doc.font('Helvetica').text(data.contratanteTelefone || '__________', c1_x + tel_lbl, y, { width: tel_val });
            doc.font('Helvetica-Bold').text('E-mail:', c2_x, y, { width: email_lbl });
            doc.font('Helvetica').text(data.contratanteEmail || '__________', c2_x + email_lbl, y, { width: email_val });
            y += maxH + 15; 

            // --- 3. Seção IMÓVEL ---
            doc.y = y;
            drawSectionTitle(doc, 'IMÓVEL');
            y = doc.y;

            // --- Linha Imóvel 1 (Imóvel na Col 1, Endereço Col 2 e 3) ---
            const imovel_lbl = 45, imovel_val = (c2_x - c1_x) - imovel_lbl - 10; 
            const endI_lbl = 55, endI_width = (PAGE_END - c2_x) - endI_lbl;
            
            h1 = getHeight(doc, 'Imóvel:', data.imovelDescricao, imovel_lbl, imovel_val);
            h2 = getHeight(doc, 'Endereço:', data.imovelEndereco, endI_lbl, endI_width);
            maxH = Math.max(h1, h2);

            doc.font('Helvetica-Bold').text('Imóvel:', c1_x, y, { width: imovel_lbl });
            doc.font('Helvetica').text(data.imovelDescricao || '__________', c1_x + imovel_lbl, y, { width: imovel_val });
            doc.font('Helvetica-Bold').text('Endereço:', c2_x, y, { width: endI_lbl });
            doc.font('Helvetica').text(data.imovelEndereco || '__________', c2_x + endI_lbl, y, { width: endI_width });
            y += maxH + 8;

            // --- Linha Imóvel 2 (3-column layout) ---
            const mat_lbl = 55, mat_val = (c2_x - c1_x) - mat_lbl - 10;
            const val_lbl = 35, val_val = (c3_x - c2_x) - val_lbl - 10;
            const adm_lbl = 95, adm_val = (PAGE_END - c3_x) - adm_lbl;
            
            h1 = getHeight(doc, 'Matrícula:', data.imovelMatricula, mat_lbl, mat_val);
            h2 = getHeight(doc, 'Valor:', formatCurrency(data.imovelValor), val_lbl, val_val);
            h3 = getHeight(doc, 'Adm. Condomínio:', data.imovelAdminCondominio, adm_lbl, adm_val);
            maxH = Math.max(h1, h2, h3);

            doc.font('Helvetica-Bold').text('Matrícula:', c1_x, y, { width: mat_lbl });
            doc.font('Helvetica').text(data.imovelMatricula || '__________', c1_x + mat_lbl, y, { width: mat_val });
            doc.font('Helvetica-Bold').text('Valor:', c2_x, y, { width: val_lbl });
            doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '__________', c2_x + val_lbl, y, { width: val_val });
            doc.font('Helvetica-Bold').text('Adm. Condomínio:', c3_x, y, { width: adm_lbl });
            doc.font('Helvetica').text(data.imovelAdminCondominio || '__________', c3_x + adm_lbl, y, { width: adm_val });
            y += maxH + 8;

            // --- Linha Imóvel 3 (3-column layout) ---
            const cond_lbl = 65, cond_val = (c2_x - c1_x) - cond_lbl - 10;
            const cha_lbl = 95, cha_val = (c3_x - c2_x) - cha_lbl - 10;
            const parc_lbl = 65, parc_val = (PAGE_END - c3_x) - parc_lbl;

            h1 = getHeight(doc, 'Condomínio:', formatCurrency(data.imovelValorCondominio), cond_lbl, cond_val);
            h2 = getHeight(doc, 'Chamada Capital:', data.imovelChamadaCapital, cha_lbl, cha_val);
            h3 = getHeight(doc, 'Nº Parcelas:', data.imovelNumParcelas, parc_lbl, parc_val);
            maxH = Math.max(h1, h2, h3);
            
            doc.font('Helvetica-Bold').text('Condomínio:', c1_x, y, { width: cond_lbl });
            doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '__________', c1_x + cond_lbl, y, { width: cond_val });
            doc.font('Helvetica-Bold').text('Chamada Capital:', c2_x, y, { width: cha_lbl });
            doc.font('Helvetica').text(data.imovelChamadaCapital || '__________', c2_x + cha_lbl, y, { width: cha_val });
            doc.font('Helvetica-Bold').text('Nº Parcelas:', c3_x, y, { width: parc_lbl });
            doc.font('Helvetica').text(data.imovelNumParcelas || '__________', c3_x + parc_lbl, y, { width: parc_val });
            y += maxH + 15; 

            // --- 4. Seção CONTRATO ---
            doc.y = y;
            drawSectionTitle(doc, 'CONTRATO');
            y = doc.y;

            // --- Linha Contrato (2 Colunas, 3ª vazia) ---
            const prazo_lbl = 70, prazo_val = (c2_x - c1_x) - prazo_lbl - 10;
            const com_lbl = 70, com_val = (c3_x - c2_x) - com_lbl - 10;

            h1 = getHeight(doc, 'Prazo (dias):', data.contratoPrazo, prazo_lbl, prazo_val);
            h2 = getHeight(doc, 'Comissão (%):', data.contratoComissaoPct, com_lbl, com_val);
            maxH = Math.max(h1, h2);

            doc.font('Helvetica-Bold').text('Prazo (dias):', c1_x, y, { width: prazo_lbl });
            doc.font('Helvetica').text(data.contratoPrazo || '__________', c1_x + prazo_lbl, y, { width: prazo_val });
            doc.font('Helvetica-Bold').text('Comissão (%):', c2_x, y, { width: com_lbl });
            doc.font('Helvetica').text(data.contratoComissaoPct || '__________', c2_x + com_lbl, y, { width: com_val });
            y += maxH + 15;

            // --- 5. Seção CLÁUSULAS ---
            doc.y = y;
            doc.x = MARGIN; 
            doc.font('Helvetica').fontSize(10);
            
            const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob n° 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            
            const clausula1 = `1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período, o contrato permanece por prazo indeterminado ou até manifestação por escrito por quaisquer das partes, pelo menos 15 (quinze) dias anteriores à intenção de cancelamento, observando-se ainda o artigo 726 do Código Civil Vigente.`;
            doc.text(clausula1, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);

            const clausula2 = `2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '____'}% sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro.`;
            doc.text(clausula2, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula3 = '3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.';
            doc.text(clausula3, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula4 = '4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.';
            doc.text(clausula4, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(0.5);
            
            const clausula5 = '5º Em caso de qualquer controvérsia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.';
            doc.text(clausula5, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 6. Assinaturas ---
            const dataHoje = new Date().toLocaleDateString('pt-BR');
            doc.text(`Joinville, ${dataHoje}`, { align: 'center', width: CONTENT_WIDTH });
            doc.moveDown(3);

            doc.text('________________________________________', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica-Bold').text((data.contratanteNome || 'CONTRATANTE').toUpperCase(), { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica').text(data.contratanteCpf || 'CPF/CNPJ', { align: 'center', width: CONTENT_WIDTH });
            
            doc.moveDown(3);
            doc.text('________________________________________', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center', width: CONTENT_WIDTH });
            doc.font('Helvetica').text('CNPJ 14.477.349/0001-23', { align: 'center', width: CONTENT_WIDTH });
            
            // --- FIM DA LÓGICA DE DESENHO ---

            doc.end();

        } catch (error) {
            console.error('Erro síncrono ao desenhar PDF:', error);
            reject(error);
        }
    });
}


// ==================================================================
// HANDLER (USANDO ASYNC/AWAIT COM A PROMISE - JÁ FUNCIONANDO)
// ==================================================================
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        console.log('Iniciando geração do PDF...');

        const pdfBuffer = await generatePdfPromise(data);

        console.log('PDF pronto. Enviando resposta...');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
        
        res.end(pdfBuffer);

    } catch (error) {
        console.error('Erro no handler ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}