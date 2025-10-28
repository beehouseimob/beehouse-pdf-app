import PDFDocument from 'pdfkit';

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612; // A4 em pontos
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // Largura útil

// --- HELPERS BÁSICOS (MANTIDOS) ---

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para desenhar o cabeçalho (Baseado em image_972f2d.png)
function drawHeader(doc) {
    // A imagem 972f2d.png não tem o logo "b-house", apenas o texto.
    // Vamos usar o cabeçalho das imagens 972f2d.png e 9698eb.png [cite: 1, 3]
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', MARGIN, MARGIN, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(2);
}

// Função helper para desenhar um Título de Seção (Corrigido)
function drawSectionTitle(doc, title) {
    // Define o Y explicitamente para evitar o erro NaN
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, doc.y, { 
        underline: true,
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(0.7); 
    doc.fontSize(10); // Reseta o tamanho
}

// Função simples para calcular altura (sem desenhar)
function getHeight(doc, label, value, labelWidth, valueWidth) {
    const val = value || '__________';
    const safeLabel = label || '';
    const safeValue = val ? String(val) : '__________';

    const labelH = doc.font('Helvetica-Bold').heightOfString(safeLabel, { width: labelWidth });
    const valueH = doc.font('Helvetica').heightOfString(safeValue, { width: valueWidth });
    return Math.max(labelH, valueH);
}


// --- HANDLER PRINCIPAL (ABORDAGEM 100% MANUAL) ---

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });

        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
            res.send(pdfData);
        });

        // --- 1. Cabeçalho ---
        drawHeader(doc);
        
        // Ponto de partida vertical
        let y = doc.y;

        // --- 2. Seção CONTRATANTE ---
        drawSectionTitle(doc, 'CONTRATANTE');
        y = doc.y; // Pega o Y *depois* do título

        // Posições X das colunas (baseado em image_972f2d.png) 
        const col1_x = MARGIN;  // Início
        const col2_x = 290;     // Meio (para CPF, Estado Civil)
        const col3_x = 450;     // Direita (para RG, Regime)

        let h = 0; // Altura da linha

        // --- Linha 1: Nome, CPF, RG ---
        const nome_lbl = 40, nome_val = (col2_x - col1_x) - nome_lbl - 10;
        const cpf_lbl = 30, cpf_val = (col3_x - col2_x) - cpf_lbl - 10;
        const rg_lbl = 40, rg_val = (CONTENT_WIDTH - (col3_x - MARGIN)) - rg_lbl;

        doc.font('Helvetica-Bold').text('Nome:', col1_x, y, { width: nome_lbl });
        doc.font('Helvetica').text(data.contratanteNome || '__________', col1_x + nome_lbl, y, { width: nome_val });
        let h1 = getHeight(doc, 'Nome:', data.contratanteNome, nome_lbl, nome_val);

        doc.font('Helvetica-Bold').text('CPF:', col2_x, y, { width: cpf_lbl });
        doc.font('Helvetica').text(data.contratanteCpf || '__________', col2_x + cpf_lbl, y, { width: cpf_val });
        let h2 = getHeight(doc, 'CPF:', data.contratanteCpf, cpf_lbl, cpf_val);
        
        doc.font('Helvetica-Bold').text('RG nº:', col3_x, y, { width: rg_lbl });
        doc.font('Helvetica').text(data.contratanteRg || '__________', col3_x + rg_lbl, y, { width: rg_val });
        let h3 = getHeight(doc, 'RG nº:', data.contratanteRg, rg_lbl, rg_val);

        y += Math.max(h1, h2, h3) + 8; // Move o Y para a próxima linha

        // --- Linha 2: Profissão, Estado Civil, Regime ---
        const prof_lbl = 55, prof_val = (col2_x - col1_x) - prof_lbl - 10;
        const est_lbl = 65, est_val = (col3_x - col2_x) - est_lbl - 10;
        const reg_lbl = 45, reg_val = (CONTENT_WIDTH - (col3_x - MARGIN)) - reg_lbl;

        doc.font('Helvetica-Bold').text('Profissão:', col1_x, y, { width: prof_lbl });
        doc.font('Helvetica').text(data.contratanteProfissao || '__________', col1_x + prof_lbl, y, { width: prof_val });
        let h4 = getHeight(doc, 'Profissão:', data.contratanteProfissao, prof_lbl, prof_val);

        doc.font('Helvetica-Bold').text('Estado Civil:', col2_x, y, { width: est_lbl });
        doc.font('Helvetica').text(data.contratanteEstadoCivil || '__________', col2_x + est_lbl, y, { width: est_val });
        let h5 = getHeight(doc, 'Estado Civil:', data.contratanteEstadoCivil, est_lbl, est_val);
        
        doc.font('Helvetica-Bold').text('Regime:', col3_x, y, { width: reg_lbl });
        doc.font('Helvetica').text(data.contratanteRegimeCasamento || '__________', col3_x + reg_lbl, y, { width: reg_val });
        let h6 = getHeight(doc, 'Regime:', data.contratanteRegimeCasamento, reg_lbl, reg_val);
        
        y += Math.max(h4, h5, h6) + 8; // Move o Y

        // --- Linha 3: Endereço (Campo único) ---
        const end_lbl = 60, end_val = CONTENT_WIDTH - end_lbl;
        doc.font('Helvetica-Bold').text('Endereço:', col1_x, y, { width: end_lbl });
        doc.font('Helvetica').text(data.contratanteEndereco || '__________', col1_x + end_lbl, y, { width: end_val });
        h = getHeight(doc, 'Endereço:', data.contratanteEndereco, end_lbl, end_val);
        y += h + 8;
        
        // --- Linha 4: Telefone, E-mail (Layout de 2 colunas) ---
        const tel_lbl = 50, tel_val = (col2_x - col1_x) - tel_lbl - 10;
        const email_lbl = 40, email_val = (CONTENT_WIDTH - (col2_x - MARGIN)) - email_lbl; // E-mail usa 2 colunas

        doc.font('Helvetica-Bold').text('Telefone:', col1_x, y, { width: tel_lbl });
        doc.font('Helvetica').text(data.contratanteTelefone || '__________', col1_x + tel_lbl, y, { width: tel_val });
        let h8 = getHeight(doc, 'Telefone:', data.contratanteTelefone, tel_lbl, tel_val);

        doc.font('Helvetica-Bold').text('E-mail:', col2_x, y, { width: email_lbl });
        doc.font('Helvetica').text(data.contratanteEmail || '__________', col2_x + email_lbl, y, { width: email_val });
        let h9 = getHeight(doc, 'E-mail:', data.contratanteEmail, email_lbl, email_val);
        
        y += Math.max(h8, h9) + 15; // Move o Y e dá espaço extra

        // --- 3. Seção IMÓVEL ---
        drawSectionTitle(doc, 'IMÓVEL');
        y = doc.y; // Pega o Y *depois* do título

        // --- Linha Imóvel 1: Imóvel, Endereço ---
        const imovel_lbl = 45, imovel_val = (col2_x - col1_x) - imovel_lbl - 10;
        const endImo_lbl = 55, endImo_val = (CONTENT_WIDTH - (col2_x - MARGIN)) - endImo_lbl;
        
        doc.font('Helvetica-Bold').text('Imóvel:', col1_x, y, { width: imovel_lbl });
        doc.font('Helvetica').text(data.imovelDescricao || '__________', col1_x + imovel_lbl, y, { width: imovel_val });
        h1 = getHeight(doc, 'Imóvel:', data.imovelDescricao, imovel_lbl, imovel_val);

        doc.font('Helvetica-Bold').text('Endereço:', col2_x, y, { width: endImo_lbl });
        doc.font('Helvetica').text(data.imovelEndereco || '__________', col2_x + endImo_lbl, y, { width: endImo_val });
        h2 = getHeight(doc, 'Endereço:', data.imovelEndereco, endImo_lbl, endImo_val);
        y += Math.max(h1, h2) + 8;

        // --- Linha Imóvel 2: Matrícula, Valor, Adm. Condomínio ---
        const mat_lbl = 55, mat_val = (col2_x - col1_x) - mat_lbl - 10;
        const val_lbl = 35, val_val = (col3_x - col2_x) - val_lbl - 10;
        const adm_lbl = 95, adm_val = (CONTENT_WIDTH - (col3_x - MARGIN)) - adm_lbl;

        doc.font('Helvetica-Bold').text('Matrícula:', col1_x, y, { width: mat_lbl });
        doc.font('Helvetica').text(data.imovelMatricula || '__________', col1_x + mat_lbl, y, { width: mat_val });
        h1 = getHeight(doc, 'Matrícula:', data.imovelMatricula, mat_lbl, mat_val);

        doc.font('Helvetica-Bold').text('Valor:', col2_x, y, { width: val_lbl });
        doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '__________', col2_x + val_lbl, y, { width: val_val });
        h2 = getHeight(doc, 'Valor:', formatCurrency(data.imovelValor), val_lbl, val_val);
        
        doc.font('Helvetica-Bold').text('Adm. Condomínio:', col3_x, y, { width: adm_lbl });
        doc.font('Helvetica').text(data.imovelAdminCondominio || '__________', col3_x + adm_lbl, y, { width: adm_val });
        h3 = getHeight(doc, 'Adm. Condomínio:', data.imovelAdminCondominio, adm_lbl, adm_val);
        y += Math.max(h1, h2, h3) + 8;
        
        // --- Linha Imóvel 3: Condomínio, Chamada, Parcelas ---
        const cond_lbl = 65, cond_val = (col2_x - col1_x) - cond_lbl - 10;
        const cha_lbl = 95, cha_val = (col3_x - col2_x) - cha_lbl - 10;
        const parc_lbl = 65, parc_val = (CONTENT_WIDTH - (col3_x - MARGIN)) - parc_lbl;

        doc.font('Helvetica-Bold').text('Condomínio:', col1_x, y, { width: cond_lbl });
        doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '__________', col1_x + cond_lbl, y, { width: cond_val });
        h1 = getHeight(doc, 'Condomínio:', formatCurrency(data.imovelValorCondominio), cond_lbl, cond_val);
        
        doc.font('Helvetica-Bold').text('Chamada Capital:', col2_x, y, { width: cha_lbl });
        doc.font('Helvetica').text(data.imovelChamadaCapital || '__________', col2_x + cha_lbl, y, { width: cha_val });
        h2 = getHeight(doc, 'Chamada Capital:', data.imovelChamadaCapital, cha_lbl, cha_val);

        doc.font('Helvetica-Bold').text('Nº Parcelas:', col3_x, y, { width: parc_lbl });
        doc.font('Helvetica').text(data.imovelNumParcelas || '__________', col3_x + parc_lbl, y, { width: parc_val });
        h3 = getHeight(doc, 'Nº Parcelas:', data.imovelNumParcelas, parc_lbl, parc_val);
        y += Math.max(h1, h2, h3) + 15; // Move e dá espaço

        // --- 4. Seção CONTRATO ---
        drawSectionTitle(doc, 'CONTRATO');
        y = doc.y; // Pega o Y *depois* do título

        // --- Linha Contrato 1: Prazo, Comissão ---
        const prazo_lbl = 70, prazo_val = (col2_x - col1_x) - prazo_lbl - 10;
        const com_lbl = 70, com_val = (CONTENT_WIDTH - (col2_x - MARGIN)) - com_lbl;
        
        doc.font('Helvetica-Bold').text('Prazo (dias):', col1_x, y, { width: prazo_lbl });
        doc.font('Helvetica').text(data.contratoPrazo || '__________', col1_x + prazo_lbl, y, { width: prazo_val });
        h1 = getHeight(doc, 'Prazo (dias):', data.contratoPrazo, prazo_lbl, prazo_val);

        doc.font('Helvetica-Bold').text('Comissão (%):', col2_x, y, { width: com_lbl });
        doc.font('Helvetica').text(data.contratoComissaoPct || '__________', col2_x + com_lbl, y, { width: com_val });
        h2 = getHeight(doc, 'Comissão (%):', data.contratoComissaoPct, com_lbl, com_val);
        y += Math.max(h1, h2) + 15; // Move e dá espaço

        // --- 5. Seção CLÁUSULAS ---
        doc.y = y;
        doc.x = MARGIN; // Reseta o X para o texto justificado
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
        
        // --- 7. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}