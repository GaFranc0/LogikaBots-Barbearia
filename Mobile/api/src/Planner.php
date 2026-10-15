<?php
declare(strict_types=1);
const INTENTS = ['FATURAMENTO','ATENDIMENTOS','CLIENTES_ATENDIDOS','TICKET_MEDIO','NOVOS_CLIENTES','CANCELAMENTOS','AGENDADOS','BARBEIROS_AGENDADOS','RANKING_SERVICO','RANKING_BARBEIRO','MELHOR_DIA_SEMANA','MELHOR_DATA','RESUMO'];
function normalized(string $text): string {
    $text=mb_strtolower($text,'UTF-8');
    $text=strtr($text,['á'=>'a','à'=>'a','â'=>'a','ã'=>'a','ä'=>'a','é'=>'e','ê'=>'e','è'=>'e','ë'=>'e','í'=>'i','ì'=>'i','î'=>'i','ï'=>'i','ó'=>'o','ô'=>'o','õ'=>'o','ò'=>'o','ö'=>'o','ú'=>'u','ù'=>'u','û'=>'u','ü'=>'u','ç'=>'c']);
    return trim(preg_replace('/\s+/u',' ',$text));
}
function containsTerm(string $text, string $term): bool {
    return (bool)preg_match('/(?<![a-z0-9])'.preg_quote(normalized($term),'/').'(?![a-z0-9])/u',$text);
}
function refusal(string $type, string $answer): array { return ['tipo'=>$type,'resposta'=>$answer,'plano'=>null]; }
function ambiguous(string $answer='Informe a métrica desejada e os filtros com nomes completos.'): array { return refusal('AMBIGUA',$answer); }
function blankPlan(): array {
    return ['intent'=>null,'ranking_por'=>null,'servico'=>null,'barbeiro'=>null,'ano'=>null,'mes'=>null,'ano_fim'=>null,'mes_fim'=>null,'dia_semana'=>null,'ambigua'=>false,'id_servico'=>null,'id_barbeiro'=>null];
}
function previousPlan(array $history): ?array {
    if (!$history) return null;
    $item=(array)$history[count($history)-1]; $raw=$item['plano']??null;
    if (!$raw instanceof stdClass && !is_array($raw)) return null;
    $raw=(array)$raw;
    if (!in_array($raw['intent']??null,INTENTS,true)) return null;
    $plan=blankPlan();
    foreach (array_keys($plan) as $key) if (array_key_exists($key,$raw)) $plan[$key]=$raw[$key];
    foreach (['servico','barbeiro'] as $field) if ($plan[$field]!==null && (!is_string($plan[$field]) || mb_strlen($plan[$field])>100)) return null;
    foreach (['ano','mes','ano_fim','mes_fim'] as $field) {
        if ($plan[$field]===null && in_array($field,['ano_fim','mes_fim'],true)) continue;
        if (!is_int($plan[$field]) || $plan[$field] < (str_starts_with($field,'ano')?2000:1) || $plan[$field] > (str_starts_with($field,'ano')?2100:12)) return null;
    }
    if (($plan['ano_fim']===null)!==($plan['mes_fim']===null)) return null;
    if (!in_array($plan['ranking_por'],[null,'FATURAMENTO','ATENDIMENTOS'],true) || !in_array($plan['dia_semana'],[null,...DAYS],true)) return null;
    // IDs do histórico não são utilizados nas consultas.
    $plan['id_servico']=$plan['id_barbeiro']=null;
    return $plan;
}
function selectedPeriod(string $text, int $year, int $month, ?array $previous): array {
    $baseYear=$previous['ano']??$year; $baseMonth=$previous['mes']??$month;
    if (preg_match('/\bmes (passado|anterior)\b/',$text)) {
        $date=(new DateTimeImmutable(sprintf('%04d-%02d-01',$year,$month)))->modify('-1 month');
        return ['ano'=>(int)$date->format('Y'),'mes'=>(int)$date->format('n'),'ano_fim'=>null,'mes_fim'=>null];
    }
    $mentions=[];
    $names=array_map('normalized',MONTHS);
    $pattern='/\b('.implode('|',$names).')(?:\s+(?:de\s+)?(\d{4}))?\b/';
    preg_match_all($pattern,$text,$matches,PREG_SET_ORDER|PREG_OFFSET_CAPTURE);
    foreach ($matches as $m) $mentions[]=['ano'=>isset($m[2])&&$m[2][0]!==''?(int)$m[2][0]:null,'mes'=>array_search($m[1][0],$names,true)+1];
    preg_match_all('/\b\d{4}\b/',$text,$years);
    foreach ($years[0] as $y) if ((int)$y<2000 || (int)$y>2100) return refusal('PERIODO_INVALIDO','Use um ano de 2000 a 2100.');
    if (count($mentions)>2 || count($years[0])>2) return refusal('NAO_SUPORTADA','Consulte um mês ou um intervalo contínuo de meses.');
    if (count($mentions)===2) {
        if (!preg_match('/\b(de|entre)\b.+\b(a|ate|e)\b/',$text)) return ambiguous('Para um total no intervalo, escreva de janeiro a março de 2026.');
        $start=$mentions[0]; $end=$mentions[1];
        $start['ano']??=$end['ano']??$baseYear; $end['ano']??=$start['ano'];
        if ($start['ano']*12+$start['mes']>$end['ano']*12+$end['mes']) return refusal('PERIODO_INVALIDO','O início do intervalo deve ser anterior ao fim. Informe o ano de cada mês.');
        return ['ano'=>$start['ano'],'mes'=>$start['mes'],'ano_fim'=>$end['ano'],'mes_fim'=>$end['mes']];
    }
    if (count($mentions)===1) return ['ano'=>$mentions[0]['ano']??(isset($years[0][0])?(int)$years[0][0]:$baseYear),'mes'=>$mentions[0]['mes'],'ano_fim'=>null,'mes_fim'=>null];
    if (count($years[0])>0) return refusal('NAO_SUPORTADA','Informe também o mês por extenso. Relatórios anuais completos não são suportados nesta API.');
    if (preg_match('/\b(este|esse|neste|nesse|deste|desse) mes\b/',$text)) return ['ano'=>$year,'mes'=>$month,'ano_fim'=>null,'mes_fim'=>null];
    return ['ano'=>$baseYear,'mes'=>$baseMonth,'ano_fim'=>$previous['ano_fim']??null,'mes_fim'=>$previous['mes_fim']??null];
}
function classifyDirect(string $text): ?array {
    $money=(bool)preg_match('/\b(fatur\w*|receitas?|dinheiro|arrecad\w*)\b/',$text);
    $visits=(bool)preg_match('/\b(atendimento\w*|cortes?|atendeu|atenderam|realizados?|fez|fizeram)\b/',$text);
    $rank=(bool)preg_match('/\b(mais|maior|melhor)\b/',$text);
    $metric=$money?'FATURAMENTO':($visits?'ATENDIMENTOS':null);
    if (preg_match('/\b(resumo|panorama|balanco|visao geral)\b/',$text)) return ['intent'=>'RESUMO','ranking_por'=>null];
    if ($rank) {
        $kind=preg_match('/\bservicos?\b/',$text)?'RANKING_SERVICO':(preg_match('/\b(barbeiros?|profissiona\w*|quem)\b/',$text)?'RANKING_BARBEIRO':(preg_match('/\bdia da semana\b/',$text)?'MELHOR_DIA_SEMANA':(preg_match('/\b(data|dia)\b/',$text)?'MELHOR_DATA':null)));
        if ($kind) return ['intent'=>$metric?$kind:'AMBIGUA','ranking_por'=>$metric];
    }
    if (preg_match('/\b(ticket|tiket|tkt)\b/',$text)) return ['intent'=>'TICKET_MEDIO','ranking_por'=>null];
    if (preg_match('/\b(novos clientes|clientes novos|cadastrad\w*)\b/',$text)) return ['intent'=>'NOVOS_CLIENTES','ranking_por'=>null];
    if (preg_match('/\bcancel\w*\b/',$text)) return ['intent'=>'CANCELAMENTOS','ranking_por'=>null];
    if (preg_match('/\b(agendad\w*|agendamento\w*|marcad\w*|pendente\w*)\b/',$text)) return ['intent'=>preg_match('/\b(quem|quais barbeiros|quais profissionais)\b/',$text)?'BARBEIROS_AGENDADOS':'AGENDADOS','ranking_por'=>null];
    if ($money) return ['intent'=>'FATURAMENTO','ranking_por'=>null];
    if (preg_match('/\b(clientes atendidos|clientes diferentes|clientes unicos|quantos clientes)\b/',$text)) return ['intent'=>'CLIENTES_ATENDIDOS','ranking_por'=>null];
    if ($visits) return ['intent'=>'ATENDIMENTOS','ranking_por'=>null];
    return null;
}
function unsupportedQuestion(string $text): bool {
    return (bool)preg_match('/\b(cresc\w*|aument\w*|diminui\w*|variacao|percent\w*|porcent\w*|taxa|lucr\w*|despesa\w*|comiss\w*|previs\w*|estimativ\w*|compar\w*|versus|vs|retencao|fidel\w*|fieis|fiel|recorr\w*|retorn\w*|volt\w*|desconto\w*|gratuit\w*|gratis|pagamento\w*|pago\w*|reembols\w*|pior|menor|separadamente|hoje|ontem|amanha|trimestre|semestre|quinzena|exceto|exclu\w*)\b|\b(mes a mes|por mes|cada mes|em relacao a|mais de uma vez|mais frequent\w*|sem contar|nao inclua|esta semana|essa semana|semana passada|ultimos? \d+ meses|proximos? \d+ meses|top\s*\d+|dia\s+\d+|listar todos|liste todos)\b|\b\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b|\b(horario|hora)\b.*\b(moviment\w*|pico|fatur\w*|melhor)\b|\b(qual|quem)\b.*\bcliente\b.*\b(mais|maior)\b/',$text);
}
function planQuestion(string $question, int $year, int $month, array $catalog, array $history, ?callable $chat = null): array {
    $text=normalized($question);
    if (preg_match('/\b(ignore|desconsidere|finja|invente|execute|apague|delete|insert|update|drop|system prompt)\b/',$text)) return refusal('FORA_ESCOPO','Consulte uma métrica da barbearia.');
    if (preg_match('/\b(nao|nunca)\b.*\b(faturou|conclui\w*|comparec\w*|atende\w*)\b/',$text) || unsupportedQuestion($text)) return refusal('NAO_SUPORTADA','Essa consulta não é suportada. Peça um total, resumo ou maior resultado mensal por faturamento ou atendimentos.');
    if (preg_match('/\b(presidente|politica|capital da|capital do|receita de|futebol|como|por que|porque|devo|deveria|sugest\w*)\b/',$text)) return refusal('FORA_ESCOPO','Posso consultar métricas dos relatórios da barbearia.');
    if (preg_match('/\b(fatur\w*|receitas?|dinheiro|ticket)\b.*\b(cancel\w*|agendad\w*|marcad\w*|por cliente|por pessoa)\b|\b(cancel\w*|agendad\w*|marcad\w*)\b.*\b(fatur\w*|receitas?|dinheiro|ticket)\b/',$text)) return refusal('NAO_SUPORTADA','Faturamento e ticket médio consideram somente atendimentos concluídos.');
    if (preg_match('/\b(fatur\w*|receitas?|dinheiro)\b.*\b(vai|vou|ira)\b|\b(vai|vou|ira)\b.*\b(fatur\w*|receitas?|dinheiro)\b/',$text)) return refusal('NAO_SUPORTADA','Não calculo receita futura.');
    $statusCount=0; foreach (['/\bconcluid\w*\b/','/\bcancel\w*\b/','/\b(agendad\w*|marcad\w*)\b/'] as $r) if (preg_match($r,$text)) $statusCount++;
    if ($statusCount>1) return refusal('NAO_SUPORTADA','Consulte um status por vez.');
    if (!preg_match('/\bresumo\b/',$text) && preg_match('/\b(fatur\w*|receitas?|dinheiro)\b.*\be (quant\w*|atendimentos|clientes|ticket)\b/',$text)) return refusal('NAO_SUPORTADA','Peça uma métrica por vez ou solicite um resumo.');
    $fragment=(bool)preg_match('/^e\b/',$text) && !preg_match('/^e\s+(quanto|quantos|quantas|qual|quais|quem)\b/',$text);
    $pronoun=(bool)preg_match('/\b(dele|dela|desse barbeiro|desse servico|mesmo periodo|nesse periodo)\b/',$text);
    $prior=($fragment||$pronoun)?previousPlan($history):null;
    if (($fragment||$pronoun) && !$prior) return ambiguous('Informe uma pergunta completa: não há contexto anterior válido.');
    if ($pronoun && !$prior['servico'] && !$prior['barbeiro']) return ambiguous('Informe o nome completo do serviço ou barbeiro.');
    $plan=blankPlan(); $matched=[];
    foreach (['servico'=>['servicos','nome_servico','id_servico'],'barbeiro'=>['barbeiros','nome','id_barbeiro']] as $kind=>$definition) {
        [$list,$name,$id]=$definition;
        $matches=array_values(array_filter($catalog[$list],static fn($item)=>containsTerm($text,(string)$item[$name])));
        if (count($matches)>1) return ambiguous("Encontrei mais de um $kind. Informe um filtro por vez.");
        if (!$matches && ($prior[$kind]??null)!==null) $matches=array_values(array_filter($catalog[$list],static fn($item)=>$item[$name]===$prior[$kind]));
        if (count($matches)>1 || (!$matches && ($prior[$kind]??null)!==null)) return ambiguous('O filtro anterior não corresponde a um cadastro único desta barbearia.');
        if ($matches) { $plan[$kind]=$matches[0][$name]; $plan[$id]=(int)$matches[0][$id]; }
        $matched[$kind]=$matches!==[];
    }
    if ($plan['servico'] && $plan['barbeiro'] && normalized($plan['servico'])===normalized($plan['barbeiro'])) return ambiguous('O nome corresponde a um serviço e a um barbeiro.');
    // Rejeitar filtros explícitos desconhecidos em vez de consultar silenciosamente todos.
    $removed=$text;
    foreach (['servicos'=> 'nome_servico','barbeiros'=>'nome'] as $list=>$field) foreach ($catalog[$list] as $item) $removed=preg_replace('/(?<![a-z0-9])'.preg_quote(normalized($item[$field]),'/').'(?![a-z0-9])/',' cadastro ',$removed);
    $removed=preg_replace('/\b('.implode('|',array_map('normalized',MONTHS)).')\b/',' mes ',$removed);
    foreach (DAYS as $d) $removed=str_replace(normalized($d),' cadastro ',$removed);
    $removed=preg_replace('/\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)\b/',' cadastro ',$removed);
    if (preg_match('/\b(?:do|da|com|pelo|pela|no|na|em|barbeiro|profissional|servico)\s+(?!cadastro\b|mes\b|ano\b|semana\b|periodo\b|barbearia\b|mais\b|melhor\b|maior\b|por\b|com\b|teve\b|tem\b|foi\b|trouxe\b|atendeu\b|fez\b|recebeu\b|realizou\b|atendimento\w*\b|status\b|media\b|total\b|geral\b)([a-z][a-z-]*)/',$removed)) return ambiguous('Use o nome completo do cadastro. Não consegui confirmar um filtro na pergunta.');
    $class=classifyDirect($text);
    if ($prior && $fragment && !$class) $class=['intent'=>$prior['intent'],'ranking_por'=>$prior['ranking_por']];
    if ($prior && preg_match('/^e (?:por |em |pelo )?(faturamento|atendimentos)[?!. ]*$/',$text) && preg_match('/^(RANKING_|MELHOR_)/',$prior['intent'])) $class=['intent'=>$prior['intent'],'ranking_por'=>containsTerm($text,'faturamento')?'FATURAMENTO':'ATENDIMENTOS'];
    if (!$class) {
        if (!preg_match('/\b(barbearia|barbeiro\w*|profissional|servico\w*|clientes?|atendimento\w*|fatur\w*|receitas?|dinheiro|ticket|agendamento\w*|balanco|financeiro|movimento|desempenho)\b/',$text) && !$prior && !$plan['servico'] && !$plan['barbeiro']) return refusal('FORA_ESCOPO','Informe uma métrica dos relatórios da barbearia.');
        $allowed=[...INTENTS,'AMBIGUA','NAO_SUPORTADA','FORA_ESCOPO'];
        $schema=['type'=>'object','additionalProperties'=>false,'properties'=>['intent'=>['type'=>'string','enum'=>$allowed],'ranking_por'=>['enum'=>['FATURAMENTO','ATENDIMENTOS',null]],'evidencia'=>['type'=>'string']],'required'=>['intent','ranking_por','evidencia']];
        try {
            $call=$chat??'ollama';
            $raw=$call([['role'=>'system','content'=>'Classifique a intenção de consulta de relatório. Só atendimentos concluídos geram faturamento e ticket. Nunca gere SQL. Melhor sem critério = AMBIGUA. Métrica não listada = NAO_SUPORTADA. Pergunta externa = FORA_ESCOPO. evidencia deve copiar um trecho literal da pergunta. Retorne exatamente intent, ranking_por e evidencia conforme schema.'],['role'=>'user','content'=>json_encode(['pergunta'=>$question,'contexto_anterior'=>$prior],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)]],$schema,45);
            $class=json_decode($raw,true,16,JSON_THROW_ON_ERROR);
            if (!is_array($class) || count($class)!==3 || !in_array($class['intent']??null,$allowed,true) || !array_key_exists('ranking_por',$class) || !in_array($class['ranking_por'],[null,'FATURAMENTO','ATENDIMENTOS'],true) || !is_string($class['evidencia']??null) || trim($class['evidencia'])==='' || !str_contains($text,normalized($class['evidencia']))) return ambiguous('Não consegui confirmar a métrica. Reformule a pergunta.');
        } catch (Throwable) { return refusal('INTERPRETACAO_INDISPONIVEL','Não consegui interpretar essa formulação agora. Tente uma pergunta direta como Quanto faturei em setembro?'); }
    }
    if (!in_array($class['intent'],INTENTS,true)) return refusal($class['intent'],'Especifique uma métrica suportada, o período e os filtros desejados.');
    if ($class['intent']==='RESUMO' && !preg_match('/\b(resumo|panorama|balanco|visao geral)\b/',$text) && !$fragment) return ambiguous();
    $plan['intent']=$class['intent'];
    $rank=(bool)preg_match('/^(RANKING_|MELHOR_)/',$plan['intent']);
    if ($rank && !in_array($class['ranking_por'],['FATURAMENTO','ATENDIMENTOS'],true)) return ambiguous('Informe o critério do ranking: faturamento ou atendimentos.');
    if ($rank && preg_match('/\b(cancel\w*|agendad\w*|agendamento\w*|marcad\w*|ticket|novos clientes)\b/',$text)) return refusal('NAO_SUPORTADA','Rankings consideram somente faturamento ou atendimentos concluídos.');
    $plan['ranking_por']=$rank?$class['ranking_por']:null;
    if (($plan['intent']==='RANKING_SERVICO' && $plan['servico']) || ($plan['intent']==='RANKING_BARBEIRO' && $plan['barbeiro'])) return ambiguous('Você quer o total desse cadastro ou o ranking de todos?');
    $days=array_values(array_filter(DAYS,static fn($d)=>containsTerm($text,str_replace('-feira','',$d))));
    if (count($days)>1) return refusal('NAO_SUPORTADA','Consulte um dia da semana por vez.');
    $plan['dia_semana']=$days[0]??($prior['dia_semana']??null);
    if ($plan['intent']==='MELHOR_DIA_SEMANA' && $days) return ambiguous('Você quer comparar os dias ou consultar apenas esse dia?');
    if ($plan['intent']==='MELHOR_DIA_SEMANA') $plan['dia_semana']=null;
    $period=selectedPeriod($text,$year,$month,$prior);
    if (isset($period['tipo'])) return $period;
    $plan=array_replace($plan,$period);
    if ($plan['intent']==='NOVOS_CLIENTES' && ($plan['servico']||$plan['barbeiro']||$plan['dia_semana'])) return refusal('NAO_SUPORTADA','Novos clientes são contados pela data de cadastro, sem filtro de barbeiro, serviço ou dia da semana.');
    if ($plan['ano']<2000 || $plan['ano']>2100) return refusal('PERIODO_INVALIDO','O período está fora dos anos suportados.');
    return ['plano'=>$plan,'periodo'=>reportPeriod($plan['ano'],$plan['mes'],$plan['ano_fim'],$plan['mes_fim'])];
}
function askReport(PDO $db, string $question, int $id, int $year, int $month, array $history): array {
    $catalog=['servicos'=>rows($db,'SELECT id_servico,nome_servico FROM servicos WHERE id_barbearia=? ORDER BY nome_servico',[$id]),'barbeiros'=>rows($db,'SELECT id_barbeiro,nome FROM barbeiros WHERE id_barbearia=? ORDER BY nome',[$id])];
    $interpretation=planQuestion($question,$year,$month,$catalog,$history);
    if (($interpretation['plano']??null)===null) return $interpretation;
    $plan=$interpretation['plano']; $period=$interpretation['periodo'];
    $result=queryReport($db,$id,$plan,$period);
    $notes=in_array($plan['intent'],['FATURAMENTO','TICKET_MEDIO','RESUMO'],true)||$plan['ranking_por']==='FATURAMENTO'?[PRICE_NOTE]:[];
    return ['resposta'=>implode(' ',[reportAnswer($result,$plan,$period),...$notes]),'periodo'=>$period,'tipo'=>$plan['intent'],'plano'=>$plan,'observacoes'=>$notes];
}
