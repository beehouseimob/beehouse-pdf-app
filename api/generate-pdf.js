import PDFDocument from 'pdfkit';

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612; // A4 em pontos
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562

// --- HELPERS BÁSICOS (MANTIDOS) ---

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para desenhar o cabeçalho (Baseado em image_978dfe.png)
function drawHeader(doc) {
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
    doc.fontSize(11).font('Helvetica-Bold').text(title, MARGIN, doc.y, { 
        underline: true,
        width: CONTENT_WIDTH,
        align: 'left'
    });
    doc.moveDown(1); // Um pouco mais de espaço
    doc.fontSize(10); // Reseta o tamanho
}

/**
 * [HELPER SIMPLES] Apenas calcula a altura máxima de um campo.
 * Não desenha nada, apenas calcula.
 */
function getHeight(doc, label, value, labelWidth, valueWidth) {
    const val = value || '__________';
    const safeLabel = label || '';
    const safeValue = val ? String(val) : '__________';

    // Salva fontes atuais
    const oldFont = doc.fontName;
    
    const labelH = doc.font('Helvetica-Bold').heightOfString(safeLabel, { width: labelWidth });
    const valueH = doc.font('Helvetica').heightOfString(safeValue, { width: valueWidth });
    
    // Restaura fonte
    doc.font(oldFont);
    return Math.max(labelH, valueH);
}


// --- HANDLER PRINCIPAL (ABORDAGEM 100% MANUAL / "BLOCOS") ---

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

        // Posições X das colunas (baseado em image_978dfe.png)
        const c1_x = MARGIN; // 50
        const c2_x = 250;
        const c3_x = 430;
        let h1 = 0, h2 = 0, h3 = 0; // Alturas

        // --- Linha 1: Nome, CPF, RG ---
        doc.font('Helvetica-Bold').text('Nome:', c1_x, y, { width: 40 });
        doc.font('Helvetica').text(data.contratanteNome || '__________', c1_x + 40, y, { width: 150 });
        h1 = getHeight(doc, 'Nome:', data.contratanteNome, 40, 150);

        doc.font('Helvetica-Bold').text('CPF:', c2_x, y, { width: 30 });
        doc.font('Helvetica').text(data.contratanteCpf || '__________', c2_x + 30, y, { width: 140 });
        h2 = getHeight(doc, 'CPF:', data.contratanteCpf, 30, 140);
        
        doc.font('Helvetica-Bold').text('RG nº:', c3_x, y, { width: 40 });
        doc.font('Helvetica').text(data.contratanteRg || '__________', c3_x + 40, y, { width: (PAGE_END - c3_x - 40) });
        h3 = getHeight(doc, 'RG nº:', data.contratanteRg, 40, (PAGE_END - c3_x - 40));
        
        y += Math.max(h1, h2, h3) + 8; // Avança Y

        // --- Linha 2: Profissão, Estado Civil, Regime ---
        doc.font('Helvetica-Bold').text('Profissão:', c1_x, y, { width: 55 });
        doc.font('Helvetica').text(data.contratanteProfissao || '__________', c1_x + 55, y, { width: 135 });
        h1 = getHeight(doc, 'Profissão:', data.contratanteProfissao, 55, 135);

        doc.font('Helvetica-Bold').text('Estado Civil:', c2_x, y, { width: 65 });
        doc.font('Helvetica').text(data.contratanteEstadoCivil || '__________', c2_x + 65, y, { width: 105 });
        h2 = getHeight(doc, 'Estado Civil:', data.contratanteEstadoCivil, 65, 105);

        doc.font('Helvetica-Bold').text('Regime:', c3_x, y, { width: 45 });
        doc.font('Helvetica').text(data.contratanteRegimeCasamento || '__________', c3_x + 45, y, { width: (PAGE_END - c3_x - 45) });
        h3 = getHeight(doc, 'Regime:', data.contratanteRegimeCasamento, 45, (PAGE_END - c3_x - 45));

        y += Math.max(h1, h2, h3) + 8;

        // --- Linha 3: Endereço (Span all columns) ---
        doc.font('Helvetica-Bold').text('Endereço:', c1_x, y, { width: 60 });
        doc.font('Helvetica').text(data.contratanteEndereco || '__________', c1_x + 60, y, { width: CONTENT_WIDTH - 60 });
        h1 = getHeight(doc, 'Endereço:', data.contratanteEndereco, 60, CONTENT_WIDTH - 60);
        y += h1 + 8;

        // --- Linha 4: Telefone, E-mail (E-mail spans 2 cols) ---
        doc.font('Helvetica-Bold').text('Telefone:', c1_x, y, { width: 50 });
        doc.font('Helvetica').text(data.contratanteTelefone || '__________', c1_x + 50, y, { width: 140 });
        h1 = getHeight(doc, 'Telefone:', data.contratanteTelefone, 50, 140);

        doc.font('Helvetica-Bold').text('E-mail:', c2_x, y, { width: 40 });
        const email_width = (PAGE_END - c2_x - 40); // E-mail começa na col 2 e vai até o fim
        doc.font('Helvetica').text(data.contratanteEmail || '__________', c2_x + 40, y, { width: email_width });
        h2 = getHeight(doc, 'E-mail:', data.contratanteEmail, 40, email_width);

        y += Math.max(h1, h2) + 15; // Próxima seção

        // --- 3. Seção IMÓVEL ---
        drawSectionTitle(doc, 'IMÓVEL');
        y = doc.y;

        // --- Linha Imóvel 1 (2-column layout) ---
        const cI_2_x = 330; // Coluna 2 para Imóvel/Endereço
        
        doc.font('Helvetica-Bold').text('Imóvel:', c1_x, y, { width: 45 });
        const imovel_width = (cI_2_x - c1_x) - 45 - 10; // Espaço entre colunas
        doc.font('Helvetica').text(data.imovelDescricao || '__________', c1_x + 45, y, { width: imovel_width });
        h1 = getHeight(doc, 'Imóvel:', data.imovelDescricao, 45, imovel_width);

        doc.font('Helvetica-Bold').text('Endereço:', cI_2_x, y, { width: 55 });
        const endI_width = (PAGE_END - cI_2_x - 55);
        doc.font('Helvetica').text(data.imovelEndereco || '__________', cI_2_x + 55, y, { width: endI_width });
        h2 = getHeight(doc, 'Endereço:', data.imovelEndereco, 55, endI_width);

        y += Math.max(h1, h2) + 8;

        // --- Linha Imóvel 2 (3-column layout) ---
        // Re-usa c1_x, c2_x, c3_x
        doc.font('Helvetica-Bold').text('Matrícula:', c1_x, y, { width: 55 });
        doc.font('Helvetica').text(data.imovelMatricula || '__________', c1_x + 55, y, { width: 135 });
        h1 = getHeight(doc, 'Matrícula:', data.imovelMatricula, 55, 135);

        doc.font('Helvetica-Bold').text('Valor:', c2_x, y, { width: 35 });
        doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '__________', c2_x + 35, y, { width: 135 });
        h2 = getHeight(doc, 'Valor:', formatCurrency(data.imovelValor), 35, 135);
        
        doc.font('Helvetica-Bold').text('Adm. Condomínio:', c3_x, y, { width: 95 });
        doc.font('Helvetica').text(data.imovelAdminCondominio || '__________', c3_x + 95, y, { width: (PAGE_END - c3_x - 95) });
        h3 = getHeight(doc, 'Adm. Condomínio:', data.imovelAdminCondominio, 95, (PAGE_END - c3_x - 95));
        
        y += Math.max(h1, h2, h3) + 8;

        // --- Linha Imóvel 3 (3-column layout) ---
        doc.font('Helvetica-Bold').text('Condomínio:', c1_x, y, { width: 65 });
        doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '__________', c1_x + 65, y, { width: 125 });
        h1 = getHeight(doc, 'Condomínio:', formatCurrency(data.imovelValorCondominio), 65, 125);
        
        doc.font('Helvetica-Bold').text('Chamada Capital:', c2_x, y, { width: 95 });
        doc.font('Helvetica').text(data.imovelChamadaCapital || '__________', c2_x + 95, y, { width: 75 });
        h2 = getHeight(doc, 'Chamada Capital:', data.imovelChamadaCapital, 95, 75);

        doc.font('Helvetica-Bold').text('Nº Parcelas:', c3_x, y, { width: 65 });
        doc.font('Helvetica').text(data.imovelNumParcelas || '__________', c3_x + 65, y, { width: (PAGE_END - c3_x - 65) });
        h3 = getHeight(doc, 'Nº Parcelas:', data.imovelNumParcelas, 65, (PAGE_END - c3_x - 65));
        
        y += Math.max(h1, h2, h3) + 15; // Move e dá espaço

        // --- 4. Seção CONTRATO ---
        drawSectionTitle(doc, 'CONTRATO');
        y = doc.y;

        // --- Linha Contrato 1 (2-column layout) ---
        // Re-usa cI_2_x
        doc.font('Helvetica-Bold').text('Prazo (dias):', c1_x, y, { width: 70 });
        doc.font('Helvetica').text(data.contratoPrazo || '__________', c1_x + 70, y, { width: 200 });
        h1 = getHeight(doc, 'Prazo (dias):', data.contratoPrazo, 70, 200);
        
        doc.font('Helvetica-Bold').text('Comissão (%):', cI_2_x, y, { width: 70 });
        doc.font('Helvetica').text(data.contratoComissaoPct || '__________', cI_2_x + 70, y, { width: (PAGE_END - cI_2_x - 70) });
        h2 = getHeight(doc, 'Comissão (%):', data.contratoComissaoPct, 70, (PAGE_END - cI_2_x - 70));

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