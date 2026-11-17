import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { classesDaGravacao, lerGravacao } from "../src/familia/teste-de-apoio";
import { montarPedido } from "../src/familia/pergunta";
import type { Jev } from "../src/familia/sugerir";
import { comCache, fetchComCorpoInteiro, type Contagem } from "./familia-jev";

describe("comCache", () => {
  it("pergunta ao Jev uma vez e responde a mesma pergunta seguinte com o que ficou em disco", async () => {
    const pasta = await mkdtemp(`${tmpdir()}/familia-jev-`);
    try {
      const gravada = lerGravacao("10032");
      let idas = 0;
      const jev: Jev = async () => {
        idas++;
        return gravada.resposta;
      };
      const pedido = montarPedido(gravada.descricao, classesDaGravacao());
      const contagem: Contagem = { chamadas: 0, doCache: 0 };
      const comDisco = comCache(jev, pasta, contagem);

      const primeira = await comDisco(pedido);
      const segunda = await comDisco(pedido);

      expect(segunda).toEqual(primeira);
      expect(idas).toBe(1);
      expect(contagem).toMatchObject({ chamadas: 1, doCache: 1 });
    } finally {
      await rm(pasta, { recursive: true });
    }
  });

  it("pergunta de novo quando a descrição muda", async () => {
    const pasta = await mkdtemp(`${tmpdir()}/familia-jev-`);
    try {
      let idas = 0;
      const jev: Jev = async () => {
        idas++;
        return lerGravacao("10032").resposta;
      };
      const contagem: Contagem = { chamadas: 0, doCache: 0 };
      const comDisco = comCache(jev, pasta, contagem);
      await comDisco(montarPedido("CORREIA", classesDaGravacao()));
      await comDisco(montarPedido("POLIA", classesDaGravacao()));
      expect(idas).toBe(2);
    } finally {
      await rm(pasta, { recursive: true });
    }
  });
});

describe("fetchComCorpoInteiro", () => {
  it("entrega uma resposta que o corpo lido pelo SDK, depois de uma cópia, ainda pode ser lido", async () => {
    const servidor = Bun.serve({ port: 0, fetch: () => Response.json({ ok: true }) });
    try {
      const resposta = await fetchComCorpoInteiro(`http://localhost:${servidor.port}/`);
      expect(resposta.clone().body).toBeNull();
      expect(resposta.status).toBe(200);
      expect(await resposta.json()).toEqual({ ok: true });
    } finally {
      await servidor.stop(true);
    }
  });
});
