import PDFDocument from 'pdfkit';

// Função helper para formatar R$
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Função helper para desenhar o cabeçalho (Esta função é simples e funciona)
function drawHeader(doc) {
    doc.fontSize(16).font('Helvetica-Bold').text('Beehouse Investimentos Imobiliários', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', { align: 'center' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', { align: 'center' });
    doc.moveDown(1.5);
    doc.fontSize(14).font('Helvetica-Bold').text('AUTORIZAÇÃO DE VENDA', { align: 'center' });
    doc.moveDown(1);
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // --- MUDANÇA CRÍTICA: GERAR EM MEMÓRIA ---
        // Não vamos mais usar doc.pipe(res).
        // Vamos capturar os dados do PDF em um array de "buffers".
        const buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            // Quando o PDF terminar de ser gerado, juntamos os pedaços
            const pdfData = Buffer.concat(buffers);

            // E SÓ ENTÃO enviamos o arquivo completo de uma vez.
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome}.pdf"`);
            res.send(pdfData);
        });
        // --- FIM DA MUDANÇA ---


        // --- 1. Cabeçalho ---
        drawHeader(doc);
        
        // --- 2. Seção CONTRATANTE (Layout Manual Robusto) ---
        doc.fontSize(11).font('Helvetica-Bold').text('CONTRATANTE', { underline: true });
        doc.moveDown(0.7);
        doc.fontSize(10);
        
        const col1 = doc.page.margins.left; // 50
        const col2 = 250;
        const col3 = 410;
        let y = doc.y;

        // Row 1
        doc.font('Helvetica-Bold').text('Nome:', col1, y);
        doc.font('Helvetica').text(data.contratanteNome || '__________', col1 + 40, y, { width: 180 });
        doc.font('Helvetica-Bold').text('CPF:', col2, y);
        doc.font('Helvetica').text(data.contratanteCpf || '__________', col2 + 30, y, { width: 140 });
        doc.font('Helvetica-Bold').text('RG nº:', col3, y);
        doc.font('Helvetica').text(data.contratanteRg || '__________', col3 + 40, y, { width: 120 });
        y += 18; // Move para a próxima linha

        // Row 2
        doc.font('Helvetica-Bold').text('Profissão:', col1, y);
        doc.font('Helvetica').text(data.contratanteProfissao || '__________', col1 + 55, y, { width: 175 });
        doc.font('Helvetica-Bold').text('Estado Civil:', col2, y);
        doc.font('Helvetica').text(data.contratanteEstadoCivil || '__________', col2 + 65, y, { width: 115 });
        doc.font('Helvetica-Bold').text('Regime:', col3, y);
        doc.font('Helvetica').text(data.contratanteRegimeCasamento || '__________', col3 + 45, y, { width: 120 });
        y += 18;

        // Row 3 (Address)
        doc.font('Helvetica-Bold').text('Endereço:', col1, y);
        doc.font('Helvetica').text(data.contratanteEndereco || '__________', col1 + 55, y, { width: 470 });
        y = doc.y + 3; // Pega o Y real após o texto (caso ele quebre a linha)
        
        // Row 4
        doc.font('Helvetica-Bold').text('Telefone:', col1, y);
        doc.font('Helvetica').text(data.contratanteTelefone || '__________', col1 + 50, y, { width: 180 });
        doc.font('Helvetica-Bold').text('E-mail:', col2, y);
        doc.font('Helvetica').text(data.contratanteEmail || '__________', col2 + 40, y, { width: 280 });
        y = doc.y + 15;

        doc.y = y; // Seta a posição Y final
        doc.moveDown(1.5); // Espaço extra

        // --- 3. Seção IMÓVEL (Layout Manual Robusto) ---
        doc.fontSize(11).font('Helvetica-Bold').text('IMÓVEL', { underline: true });
        doc.moveDown(0.7);
        y = doc.y;

        doc.font('Helvetica-Bold').text('Imóvel:', col1, y);
        doc.font('Helvetica').text(data.imovelDescricao || '__________', col1 + 45, y, { width: 480 });
        y = doc.y + 3;

        doc.font('Helvetica-Bold').text('Endereço:', col1, y);
        doc.font('Helvetica').text(data.imovelEndereco || '__________', col1 + 55, y, { width: 470 });
        y = doc.y + 3;
        
        doc.font('Helvetica-Bold').text('Matrícula:', col1, y);
        doc.font('Helvetica').text(data.imovelMatricula || '__________', col1 + 55, y, { width: 175 });
        doc.font('Helvetica-Bold').text('Valor:', col2, y);
        doc.font('Helvetica').text(formatCurrency(data.imovelValor), col2 + 35, y, { width: 280 });
        y = doc.y + 15;

        doc.font('Helvetica-Bold').text('Adm. Condomínio:', col1, y);
        doc.font('Helvetica').text(data.imovelAdminCondominio || '__________', col1 + 95, y, { width: 135 });
        doc.font('Helvetica-Bold').text('Condomínio:', col2, y);
        doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio), col2 + 65, y, { width: 250 });
        y = doc.y + 15;

        doc.font('Helvetica-Bold').text('Chamada Capital:', col1, y);
        doc.font('Helvetica').text(data.imovelChamadaCapital || '__________', col1 + 95, y, { width: 135 });
        doc.font('Helvetica-Bold').text('Nº Parcelas:', col2, y);
        doc.font('Helvetica').text(data.imovelNumParcelas || '__________', col2 + 65, y, { width: 250 });
        y = doc.y + 15;

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
        // Isso vai disparar o evento 'end' que definimos lá em cima
        doc.end();

    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}