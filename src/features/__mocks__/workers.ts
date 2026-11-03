import type { SimResult } from "@/vendor/copasi";
import type { WorkerType } from "../workers.ts";
import {
  createMockWorkerMessageHandler,
  MockWorker,
} from "@/testing-utils/mockWorker.ts";

export const createWorker = (type: WorkerType) => {
  const worker = new MockWorker();

  switch (type) {
    case "copasi": {
      worker.port.addEventListener(
        "message",
        createMockWorkerMessageHandler(worker, (action) => {
          switch (action.type) {
            case "timeCourse":
              return {
                num_variables: 2,
                titles: ["Time", "A"],
                columns: [
                  [1, 2, 3, 4, 5],
                  [0, 1, 2, 3, 4],
                ],
              } as SimResult;

            case "steadyState":
              return {
                value: 1.44677e-31,
                initialConcentrations: [
                  {
                    name: "A",
                    value: 10,
                  },
                  {
                    name: "B",
                    value: 0,
                  },
                  {
                    name: "C",
                    value: 0,
                  },
                ],
                eigenValues: [
                  [0, 0],
                  [-0.20000000000000004, 0],
                  [-0.35, 0],
                ],
                jacobian: {
                  columns: ["B", "A", "C"],
                  rows: ["B", "A", "C"],
                  values: [
                    [-0.20000000000000004, 0.35, 0],
                    [0, -0.35, 0],
                    [0.20000000000000004, 0, 0],
                  ],
                },
                concentrationControl: {
                  columns: ["(_J0)", "(_J1)", "'Summation Error'"],
                  rows: ["B", "A", "C"],
                  values: [
                    [
                      2.576994129064049e-308, 1.4327406791458241e228,
                      6.4418866421773e170,
                    ],
                    [
                      3.6558223763225502e233, 1.4285355974904633e248,
                      6.520165976635771e252,
                    ],
                    [
                      8.422413767467766e252, 1.983107124304e-312,
                      2.5768583220998636e-308,
                    ],
                  ],
                },
                fluxControl: {
                  columns: ["(_J0)", "(_J1)", "'Summation Error'"],
                  rows: ["(_J0)", "(_J1)"],
                  values: [
                    [
                      9.083672028618948e223, 3.004667062196259e48,
                      8.70024606538e-313,
                    ],
                    [
                      7.08665963813e-313, 2.576892273266059e-308,
                      9.083672028618948e223,
                    ],
                  ],
                },
                elasticities: {
                  columns: ["B", "A", "C"],
                  rows: ["(_J0)", "(_J1)"],
                  values: [
                    [
                      2.576994129064049e-308, 1.4327406791458241e228,
                      6.4418866421773e170,
                    ],
                    [5.252083457363487e170, 1.8331457249345503e50, 1.1787e-319],
                  ],
                },
              };

            case "loadModel":
              return {
                boundarySpeciesNames: [],
                reactionIds: ["_J0", "_J1"],
                modelInfo: {
                  species: [
                    {
                      compartment: "default_compartment",
                      concentration: 10,
                      id: "A",
                      initial_concentration: 10,
                      initial_particle_number: 6.02214179e24,
                      name: "A",
                      particle_number: 6.02214179e24,
                      type: "reactions",
                    },
                    {
                      compartment: "default_compartment",
                      concentration: 0,
                      id: "B",
                      initial_concentration: 0,
                      initial_particle_number: 0,
                      name: "B",
                      particle_number: 0,
                      type: "reactions",
                    },
                    {
                      compartment: "default_compartment",
                      concentration: 0,
                      id: "C",
                      initial_concentration: 0,
                      initial_particle_number: 0,
                      name: "C",
                      particle_number: 0,
                      type: "reactions",
                    },
                  ],
                  compartments: [
                    {
                      id: "default_compartment",
                      name: "default_compartment",
                      size: 1,
                      type: "fixed",
                    },
                  ],
                  reactions: [
                    {
                      id: "_J0",
                      local_parameters: [],
                      name: "_J0",
                      reversible: true,
                      scheme: "A = B",
                    },
                    {
                      id: "_J1",
                      local_parameters: [],
                      name: "_J1",
                      reversible: true,
                      scheme: "B = C",
                    },
                  ],
                  global_parameters: [
                    {
                      id: "k1",
                      initial_value: 0.35,
                      name: "k1",
                      type: "fixed",
                      value: 0.35,
                    },
                    {
                      id: "k2",
                      initial_value: 0.2,
                      name: "k2",
                      type: "fixed",
                      value: 0.2,
                    },
                  ],
                  time: 0,
                  model: {
                    name: "NoName",
                    notes: "",
                  },
                  status: "success",
                  messages:
                    ">WARNING 2025-06-02T02:24:26<\n  SBML (92): The default extent unit has not been set in the model or differs from the substance default units. COPASI will assume that the extent units are the same as the substance units.\n",
                },
              };
          }
        }),
      );
      break;
    }

    case "libsbmlsim": {
      worker.port.addEventListener(
        "message",
        createMockWorkerMessageHandler(worker, (_) => {
          // TODO: mock this? or maybe not
          return {};
        }),
      );
      break;
    }

    case "antimony": {
      worker.port.addEventListener(
        "message",
        createMockWorkerMessageHandler(worker, (action) => {
          switch (action.type) {
            case "convertSbmlToAntimony":
              return "fake antimony code";
          }
        }),
      );
      break;
    }
  }

  return worker;
};
