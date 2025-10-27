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
    doc.moveDown(1);
}

// Função helper para desenhar uma seção
function drawSection(doc, title, fields) {
    doc.fontSize(11).font('Helvetica-Bold').text(title, { underline: true });
    doc.moveDown(0.7);
    doc.fontSize(10).font('Helvetica');
    
    const col1X = doc.x;
    const col2X = doc.x + 200;
    const col3X = doc.x + 360;
    let currentY = doc.y;

    fields.forEach((row, index) => {
        let maxRowHeight = 0;
        
        // Desenha labels e valores
        if (row.col1) {
            doc.font('Helvetica-Bold').text(row.col1.label, col1X, currentY);
            doc.font('Helvetica').text(row.col1.value || '__________', col1X + doc.widthOfString(row.col1.label) + 4, currentY, { width: 180 });
            maxRowHeight = Math.max(maxRowHeight, doc.heightOfString(row.col1.value || '__________', { width: 180 }));
        }
        if (row.col2) {
            doc.font('Helvetica-Bold').text(row.col2.label, col2X, currentY);
            doc.font('Helvetica').text(row.col2.value || '__________', col2X + doc.widthOfString(row.col2.label) + 4, currentY, { width: 140 });
            maxRowHeight = Math.max(maxRowHeight, doc.heightOfString(row.col2.value || '__________', { width: 140 }));
        }
        if (row.col3) {
            doc.font('Helvetica-Bold').text(row.col3.label, col3X, currentY);
            doc.font('Helvetica').text(row.col3.value || '__________', col3X + doc.widthOfString(row.col3.label) + 4, currentY, { width: 140 });
            maxRowHeight = Math.max(maxRowHeight, doc.heightOfString(row.col3.value || '__________', { width: 140 }));
        }
        
        currentY += maxRowHeight + 4; // Adiciona 4 de padding
    });
    
    doc.y = currentY + 10; // Pula para depois da seção
}


export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome}.pdf"`);
        doc.pipe(res);

        // --- 1. Cabeçalho ---
        drawHeader(doc);
        
        // --- 2. Seção CONTRATANTE ---
        const contratanteFields = [
            { col1: { label: 'Nome:', value: data.contratanteNome }, col2: { label: 'CPF:', value: data.contratanteCpf }, col3: { label: 'RG nº:', value: data.contratanteRg } },
            { col1: { label: 'Profissão:', value: data.contratanteProfissao }, col2: { label: 'Estado Civil:', value: data.contratanteEstadoCivil }, col3: { label: 'Regime:', value: data.contratanteRegimeCasamento } },
            { col1: { label: 'Endereço:', value: data.contratanteEndereco } },
            { col1: { label: 'Telefone:', value: data.contratanteTelefone }, col2: { label: 'E-mail:', value: data.contratanteEmail } }
        ];
        drawSection(doc, 'CONTRATANTE', contratanteFields);

        // --- 3. Seção IMÓVEL ---
        const imovelFields = [
            { col1: { label: 'Imóvel:', value: data.imovelDescricao } },
            { col1: { label: 'Endereço:', value: data.imovelEndereco } },
            { col1: { label: 'Matrícula:', value: data.imovelMatricula }, col2: { label: 'Valor:', value: formatCurrency(data.imovelValor) } },
            { col1: { label: 'Adm. Condomínio:', value: data.imovelAdminCondominio }, col2: { label: 'Condomínio:', value: formatCurrency(data.imovelValorCondominio) } },
            { col1: { label: 'Chamada Capital:', value: data.imovelChamadaCapital }, col2: { label: 'Nº Parcelas:', value: data.imovelNumParcelas } }
        ];
        drawSection(doc, 'IMÓVEL', imovelFields);

        // --- 4. Seção CLÁUSULAS (A CORREÇÃO ESTÁ AQUI) ---
        
        doc.font('Helvetica').fontSize(10);
        
        const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob n° 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
        doc.text(textoPreambulo, { align: 'justify' });
        doc.moveDown(1);
        
        // Cláusula 1 (Juntamos o texto ANTES de enviar ao PDF)
        const clausula1 = `1º A venda é concebida a contar desta data pelo prazo de ${data.contratoPrazo || '____'} dias. Após esse período, o contrato permanece por prazo indeterminado ou até manifestação por escrito por quaisquer das partes, pelo menos 15 (quinze) dias anteriores à intenção de cancelamento, observando-se ainda o artigo 726 do Código Civil Vigente.`;
        doc.text(clausula1, { align: 'justify' });
        doc.moveDown(0.5);

        // Cláusula 2
        const clausula2 = `2º O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '____'}% sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro.`;
        doc.text(clausula2, { align: 'justify' });
        doc.moveDown(0.5);

        // Cláusula 3
        const clausula3 = '3º A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.';
        doc.text(clausula3, { align: 'justify' });
        doc.moveDown(0.5);
        
        // Cláusula 4
        const clausula4 = '4º O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.';
        doc.text(clausula4, { align: 'justify' });
        doc.moveDown(0.5);
        
        // Cláusula 5
        const clausula5 = '5º Em caso de qualquer controvérsia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.';
        doc.text(clausula5, { align: 'justify' });
        doc.moveDown(1);

        // Fechamento
        const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
        doc.text(textoFechamento, { align: 'justify' });
        doc.moveDown(2);

        // --- 5. Assinaturas (Também corrigido) ---
        const dataHoje = new Date().toLocaleDateString('pt-BR');
        doc.text(`Joinville, ${dataHoje}`, { align: 'center' });
        doc.moveDown(3);

        // Assinatura Contratante
        doc.text('________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text(data.contratanteNome.toUpperCase() || 'CONTRATANTE', { align: 'center' });
        doc.font('Helvetica').text(data.contratanteCpf || 'CPF/CNPJ', { align: 'center' });
        
        doc.moveDown(3); // Espaço entre assinaturas
        
        // Assinatura Contratada
        doc.text('________________________________________', { align: 'center' });
        doc.font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center' });
        doc.font('Helvetica').text('CNPJ 14.477.349/0001-23', { align: 'center' });
        
        // --- 6. Finaliza o PDF ---
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}