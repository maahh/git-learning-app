export type Condition = {
  id: string;
  label: string;
  kind: "state" | "action";
};

export type ConditionCheck = Condition & {
  ok: boolean;
};
