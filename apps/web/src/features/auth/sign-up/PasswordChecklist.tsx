import { PASSWORD_RULES } from '@app/shared';

/** Live view of the same rules the schema validates, derived from the shared constants. */
export function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul id={id} aria-label="Password requirements" className="space-y-1 text-xs">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.id}
            data-met={met}
            className={
              met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
            }
          >
            <span aria-hidden="true" className="mr-1.5">
              {met ? '✓' : '○'}
            </span>
            {rule.label}
            <span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
