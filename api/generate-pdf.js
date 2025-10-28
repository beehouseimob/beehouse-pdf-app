import PDFDocument from 'pdfkit';

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para desenhar o cabeçalho
function drawHeader(doc) {
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(1.5); // Mais espaço
}

// Função helper para desenhar um par de Label + Valor
function drawField(doc, label, value, x, y, options = {}) {
    const labelWidth = options.labelWidth || 60;
    const valueWidth = options.valueWidth || 150;
    
    doc.font('Helvetica-Bold').text(label, x, y, { width: labelWidth, lineBreak: false });
    doc.font('Helvetica').text(value || '__________', x + labelWidth, y, { width: valueWidth });
    
    // Retorna a altura do campo para sabermos quanto pular
    const labelHeight = doc.heightOfString(label, { width: labelWidth });
    const valueHeight = doc.heightOfString(value || '__________', { width: valueWidth });
    return Math.max(labelHeight, valueHeight);
}


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // --- MUDANÇA CRÍTICA: GERAR EM MEMÓRIA ---
        // (Isso já está funcionando, vamos manter)
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome}.pdf"`);
            res.send(pdfData);
        });

        // --- 1. Cabeçalho ---
        drawHeader(doc);
        
        // --- 2. Seção CONTRATANTE (Layout Manual v3 - Mais Robusto) ---
        doc.fontSize(11).font('Helvetica-Bold').text('CONTRATANTE', { underline: true });
        doc.moveDown(0.7);
        doc.fontSize(10);
        
        const col1 = 50; // Margem Esquerda
        const col2 = 270;
        const col3 = 440;
        let y = doc.y;
        let rowHeight = 0;

        // --- Linha 1 ---
        drawField(doc, 'Nome:', data.contratanteNome, col1, y, { labelWidth: 40, valueWidth: 200 });
        drawField(doc, 'CPF:', data.contratanteCpf, col2, y, { labelWidth: 30, valueWidth: 150 });
        drawField(doc, 'RG nº:', data.contratanteRg, col3, y, { labelWidth: 40, valueWidth: 100 });
        y += 18; // Pula para a próxima linha

        // --- Linha 2 ---
        drawField(doc, 'Profissão:', data.contratanteProfissao, col1, y, { labelWidth: 55, valueWidth: 185 });
        drawField(doc, 'Estado Civil:', data.contratanteEstadoCivil, col2, y, { labelWidth: 65, valueWidth: 115 });
        drawField(doc, 'Regime:', data.contratanteRegimeCasamento, col3, y, { labelWidth: 45, valueWidth: 95 });
        y += 18;

        // --- Linha 3 (Endereço) ---
        doc.font('Helvetica-Bold').text('Endereço:', col1, y);
        doc.font('Helvetica').text(data.contratanteEndereco || '__________', col1 + 55, y, { width: 470 });
        y = doc.y + 5; // Pega o Y real após o texto (caso ele quebre a linha) + padding
        
        // --- Linha 4 ---
        drawField(doc, 'Telefone:', data.contratanteTelefone, col1, y, { labelWidth: 50, valueWidth: 190 });
        drawField(doc, 'E-mail:', data.contratanteEmail, col2, y, { labelWidth: 40, valueWidth: 270 });
        y = doc.y + 15; // Pula linha

        doc.y = y; // Seta a posição Y final
        doc.moveDown(1.5); // Espaço extra

        // --- 3. Seção IMÓVEL (Layout Manual v3) ---
        doc.fontSize(11).font('Helvetica-Bold').text('IMÓVEL', { underline: true });
        doc.moveDown(0.7);
        y = doc.y;

        doc.font('Helvetica-Bold').text('Imóvel:', col1, y);
        doc.font('Helvetica').text(data.imovelDescricao || '__________', col1 + 45, y, { width: 480 });
        y = doc.y + 5;

        doc.font('Helvetica-Bold').text('Endereço:', col1, y);
        doc.font('Helvetica').text(data.imovelEndereco || '__________', col1 + 55, y, { width: 470 });
        y = doc.y + 5;
        
        // --- Linha Imóvel 3 ---
        rowHeight = drawField(doc, 'Matrícula:', data.imovelMatricula, col1, y, { labelWidth: 55, valueWidth: 185 });
        drawField(doc, 'Valor:', formatCurrency(data.imovelValor), col2, y, { labelWidth: 35, valueWidth: 250 });
        y += rowHeight + 5;

        // --- Linha Imóvel 4 ---
        rowHeight = drawField(doc, 'Adm. Condomínio:', data.imovelAdminCondominio, col1, y, { labelWidth: 95, valueWidth: 145 });
        drawField(doc, 'Condomínio:', formatCurrency(data.imovelValorCondominio), col2, y, { labelWidth: 65, valueWidth: 220 });
        y += rowHeight + 5;

        // --- Linha Imóvel 5 ---
        rowHeight = drawField(doc, 'Chamada Capital:', data.imovelChamadaCapital, col1, y, { labelWidth: 95, valueWidth: 145 });
        drawField(doc, 'Nº Parcelas:', data.imovelNumParcelas, col2, y, { labelWidth: 65, valueWidth: 220 });
        y += rowHeight + 15;

        doc.y = y;
        doc.moveDown(1.5);

        // --- 4. Seção CLÁUSULAS (Código que já estava correto) ---
        doc.font('Helvetica').fontSize(10);
        
        const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob n° 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
        doc.text(textoPreambulo, { align: 'justify' });
        doc.moveDown(1);
        
        const clausula1 = `1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período, o contrato permanece por prazo indeterminado ou até manifestação por escrito por quaisquer das partes, pelo menos 15 (quinze) dias anteriores à intenção de cancelamento, observando-se ainda o artigo 726 do Código Civil Vigente.`;
        doc.text(clausula1, { align: 'justify' });
        doc.moveDown(0.5);

        const clausula2 = `2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '____'}% sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro.`;
        doc.text(clausula2, { align: 'justify' });
        doc.moveDown(0.5);
        
        const clausula3 = '3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.';
        doc.text(clausula3, { align: 'justify' });
        doc.moveDown(0.5);
        
        const clausula4 = '4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.';
        doc.text(clausula4, { align: 'justify' });
        doc.moveDown(0.5);
        
        const clausula5 = '5º Em caso de qualquer controvérsia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.';
        doc.text(clausula5, { align: 'justify' });
        doc.moveDown(1);

        const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
        doc.text(textoFechamento, { align: 'justify' });
        doc.moveDown(2);

        // --- 5. Assinaturas ---
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        doc.text(`Joinville, ${dataHoje}`, { align: 'center' });
        doc.moveDown(3);

        doc.text('________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text(data.contratanteNome.toUpperCase() || 'CONTRATANTE', { align: 'center' });
        doc.font('Helvetica').text(data.contratanteCpf || 'CPF/CNPJ', { align: 'center' });
        
        doc.moveDown(3);
        doc.text('________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center' });
        doc.font('Helvetica').text('CNPJ 14.477.349/0001-23', { align: 'center' });
        
        // --- 6. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}