/* ═══════════════════════════════════════════════════════════
   Sistema de salas
   Carregue ESTE arquivo no <head> de toda página, antes dos outros scripts.

   • window.SALA  → { codigo, nome, legado, classes }
   • window.P(caminho) → caminho no Firebase já dentro da sala atual

   A sala "legada" (o Path of Stars original) continua usando os
   caminhos antigos na raiz do banco (fichas, npc_grupos, usuarios...),
   então NENHUM dado existente precisa ser movido.
   Salas novas ficam em  salas/<CODIGO>/dados/...
   ═══════════════════════════════════════════════════════════ */
(function () {
  // ▼▼ Sala do seu RPG (o código que você digita em "Entrar na sala") ▼▼
  var SALA_LEGADA = { codigo: 'PATHSTARS', nome: 'Path of Stars', legado: true, classes: true };
  // ▲▲ pode trocar o código à vontade, só não use espaços/símbolos ▲▲

  var s = null;
  try { s = JSON.parse(sessionStorage.getItem('sala') || 'null'); } catch (e) {}
  // sessão antiga (logada antes do sistema de salas) = sala legada
  if (!s || !s.codigo) s = SALA_LEGADA;
  if (s.codigo === SALA_LEGADA.codigo) s = SALA_LEGADA;

  window.SALA_LEGADA = SALA_LEGADA;
  window.SALA = s;
  window.P = function (caminho) {
    return s.legado ? caminho : 'salas/' + s.codigo + '/dados/' + caminho;
  };
  // sufixo para chaves de localStorage (mapa, favoritos...) não se misturarem entre salas
  window.SALA_SUF = s.legado ? '' : '_' + s.codigo;
})();
