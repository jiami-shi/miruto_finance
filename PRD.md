# 予算・支払・月報承認 Workflow PRD

## 1. 背景

現在の予算・支払・月報承認業務は、Google Sheets、Google Apps Script、GAS Web App、Slack、CSV 出力を組み合わせて運用されている。

既存運用では、複数の取込シート、支払ログ、月報作成用シート、確認ツール用シートがそれぞれ実質的なデータソースになっており、承認状態、履歴、通知、月報出力の責務が分散している。

本プロジェクトでは、Google Workspace エコシステム内で運用を継続しながら、予算・支払・月報承認をより安全で、保守しやすく、監査可能な内部 workflow として再設計する。

## 2. Product Goal

予算申請、支払申請、月報承認の workflow を、統一されたデータモデル、明確な状態管理、ロールベースの承認 UI、監査ログ、通知処理に整理する。

第一期では全面刷新ではなく、既存 Sheets / Apps Script / CSV 運用を壊さずに、AppSheet を使った承認 workflow の PoC を構築する。

## 3. 現状 Workflow

主なデータソースは以下である。

- `imp_定常予算申請`
- `imp_HD取得予算管理リスト`
- `imp_シニア_支払いリスト`
- `支払い管理_定常`

Apps Script は条件に応じて支払データを以下の支払ログへ転記している。

- `支払いログ_振込前払い`
- `支払いログ_翌月末払い`
- `支払いログ_売上からの差引`

月報対象データは `agg_月報作成用シート` に集約され、承認確認 UI 用に `月報確認ツール生成用` が生成される。

現在の GAS Web App は、承認カード表示、ロール別フィルタ、証憑リンク確認、単票閲覧、複数選択、複数承認、承認状態の書き戻し、Slack 通知を行っている。

## 4. 現在の課題

- データソースが分散しており、正しい状態の所在が不明確である。
- 承認状態が文字列に依存しており、正式な状態機械がない。
- 承認権限が人名や脆い条件に依存している。
- Sheet の列構造変更により Apps Script が壊れやすい。
- 承認、月報、支払ログ、Slack 通知の責務が混在している。
- 誰が、いつ、何を承認したかを追跡しにくい。
- `支払いNo` や Sheet row を長期主キーとして使うにはリスクがある。
- `月報確認ツール生成用` が view ではなく事実上のデータソースになっている。

## 5. Scope

第一期では、AppSheet を使って支払単位の承認 workflow を構築する。

対象範囲:

- 20〜30 件程度のテストデータ
- 支払単位の承認
- 予算申請と支払明細の一対多関係
- 経理確認者、事業承認者、役員承認者による承認
- approve / reject / return
- 承認イベントの保存
- Slack 通知 job の作成と送信
- 予算残高の最小計算
- 既存月報 CSV 出力との接続確認

## 6. Non-goals

第一期では以下を行わない。

- Cloud SQL への移行
- 完全な独自 Web App の再構築
- 既存月報 CSV 生成処理の全面刷新
- BigQuery / Looker Studio 連携
- 複雑な組織階層・兼務ロール管理
- 全履歴データの完全移行
- すべての支払種別・例外処理の網羅

## 7. Users / Roles

| role code | 表示名 | 説明 |
| --- | --- | --- |
| `requester` | 申請者 | 予算・支払の元申請者 |
| `finance_reviewer` | 経理確認者 | 金額、証憑、予算残高を確認する |
| `business_approver` | 事業承認者 | 事業責任者として承認する |
| `executive_approver` | 役員承認者 | 最終承認を行う |
| `admin` | 管理者 | データ、設定、エラーを管理する |

第一期では少数の利用者に限定する。

## 8. User Journey

### 経理確認者

1. AppSheet の承認キューを開く。
2. `payment_candidate` の支払を確認する。
3. 金額、証憑、予算情報を確認する。
4. 問題なければ approve し、状態を `finance_checked` にする。
5. 問題があれば requester へ return、または reject する。

### 事業承認者

1. AppSheet の承認キューを開く。
2. `finance_checked` の支払を確認する。
3. approve / return / reject を実行する。
4. approve 後、状態は `business_approved` になる。

### 役員承認者

1. AppSheet の承認キューを開く。
2. `business_approved` の支払を確認する。
3. approve / return / reject を実行する。
4. approve 後、状態は `executive_approved` になる。

### 申請者

第一期では AppSheet で直接修正しない。

差戻しされた場合、既存の元 Sheet 側で修正し、再取込または経理確認者による再確認を行う。

## 9. Functional Requirements

- システムは既存 Sheet から支払候補データを取込できること。
- システムは `request_id` と `payment_id` を生成・保持できること。
- 一つの `Request` は複数の `Payment` を持てること。
- AppSheet はログインユーザーの role に応じて承認対象だけを表示すること。
- 経理確認者は `payment_candidate` を approve / return / reject できること。
- 事業承認者は `finance_checked` を approve / return / reject できること。
- 役員承認者は `business_approved` を approve / return / reject できること。
- すべての承認操作は `ApprovalEvents` に追記されること。
- 承認操作は Slack 通知 job を作成できること。
- Slack 通知失敗は承認処理自体を失敗させないこと。
- 予算残高は `finance_checked` 以降の支払を pending として計算できること。
- 月報 CSV は第一期では既存処理を基本維持すること。

## 10. Data Objects

第一期の主要データオブジェクトは以下である。

- `Requests`
- `Payments`
- `Budgets`
- `ApprovalEvents`
- `Users`
- `ApprovalRules`
- `EvidenceFiles`
- `Notifications`
- `ErrorLog`

月報の `MonthlyReports` と `MonthlyReportItems` は、既存 CSV 処理の置換時に追加検討する。

## 11. State Machine

第一期の支払状態は以下を基本とする。

| status code | 表示名 | current role |
| --- | --- | --- |
| `imported` | 取込済 | system |
| `payment_candidate` | 支払候補 | `finance_reviewer` |
| `finance_checked` | 経理確認済 | `business_approver` |
| `business_approved` | 事業承認済 | `executive_approver` |
| `executive_approved` | 役員承認済 | system |
| `monthly_report_exported` | 月報出力済 | system |
| `completed` | 完了 | none |
| `returned_to_finance` | 経理差戻し | `finance_reviewer` |
| `returned_to_requester` | 申請者差戻し | `requester` |
| `rejected` | 却下 | none |
| `cancelled` | キャンセル | none |
| `error` | エラー | admin |

主な承認フロー:

```text
payment_candidate
  -> finance_checked
  -> business_approved
  -> executive_approved
  -> monthly_report_exported
  -> completed
```

状態判定は必ず `status_code` を使う。日本語表示名は UI 表示専用とする。

## 12. Permission Requirements

- ユーザー権限は `Users` テーブルで管理する。
- AppSheet は `USEREMAIL()` を使って現在ユーザーを判定する。
- ユーザーは自分の role に対応する承認対象だけを閲覧・操作できる。
- `db_*` テーブルは原則として直接編集させない。
- 手動編集が必要な場合は admin に限定する。

## 13. AppSheet Requirements

AppSheet は第一期の承認 UI として利用する。

必要な画面:

- 経理確認キュー
- 事業承認キュー
- 役員承認キュー
- 支払詳細
- 証憑リンク表示
- approve / return / reject action
- コメント入力
- 管理者向けエラー・通知確認 view

第一期では、申請者による修正 UI は作らない。

## 14. Apps Script Requirements

Apps Script は UI ではなく backend 処理を担当する。

主な責務:

- 既存 Sheet からの取込
- `db_*` テーブルへの同期
- 承認状態更新
- `ApprovalEvents` 追記
- 予算残高再計算
- Slack 通知 job 作成
- pending 通知 job の送信
- 月報 CSV 生成処理との接続
- エラー記録

## 15. Slack Notification Requirements

- 承認操作は Slack を直接送信せず、`Notifications` に job を作成する。
- backend job が pending 通知を送信する。
- 送信成功・失敗・試行回数・エラー内容を記録する。
- 通知先は人名ではなく role または channel を基準にする。

## 16. Monthly Report CSV Requirements

第一期では既存の月報 CSV 生成処理を維持する。

PoC の目的は、`executive_approved` になった支払データが既存月報出力に接続可能か確認することである。

月報バッチ管理、月報明細テーブル、CSV 再生成履歴は第二期以降に検討する。

## 17. Budget Calculation Requirements

第一期では以下の最小計算を行う。

```text
remaining_amount = allocated_amount - used_amount - pending_amount
```

`pending_amount` は以下の状態の支払金額合計とする。

- `finance_checked`
- `business_approved`
- `executive_approved`
- `monthly_report_exported`
- `returned_to_finance`

`returned_to_requester`、`rejected`、`cancelled` は予算を占有しない。

## 18. Error Handling

- backend 処理の失敗は `ErrorLog` に記録する。
- Slack 通知失敗は承認状態を rollback しない。
- 不正な状態遷移は拒否し、エラーとして記録する。
- 必須データ不足の取込行は `error` または import error として扱う。

## 19. Audit Log Requirements

すべての承認操作は `ApprovalEvents` に追記する。

最低限記録する項目:

- `approval_event_id`
- `payment_id`
- `request_id`
- `actor_email`
- `actor_role`
- `action`
- `from_status`
- `to_status`
- `comment`
- `created_at`

`ApprovalEvents` は編集ではなく追記を基本とする。

## 20. PoC Scope

PoC は以下に限定する。

- 20〜30 件のテストデータ
- Google Sheets を database として利用
- AppSheet 承認キュー
- 経理確認者、事業承認者、役員承認者
- approve / reject / return
- `ApprovalEvents` 保存
- Slack 通知テスト
- 予算残高の最小計算
- 既存月報 CSV との接続確認

## 21. Success Criteria

- テストデータが AppSheet の role 別 queue に正しく表示される。
- 各 role が許可された状態だけを操作できる。
- approve / reject / return の結果が `Payments` に反映される。
- 各操作が `ApprovalEvents` に追記される。
- `finance_checked` 以降の金額が予算 pending として反映される。
- Slack 通知が job として記録され、送信結果を追跡できる。
- 既存月報 CSV 処理を壊さない。

## 22. Risks

- Google Sheets を database として使うため、直接編集や列変更の統制が必要である。
- AppSheet の権限設定が不十分な場合、承認対象外データが見えるリスクがある。
- 既存 Sheet の列名・運用変更により import mapping が壊れる可能性がある。
- 予算残高計算の定義が曖昧な場合、業務上の数字とズレる可能性がある。
- return 後の再提出運用が手動の場合、ステータス同期漏れが起きる可能性がある。

## 23. Open Questions

- 予算管理表の正式な column mapping
- 既存 `支払いNo` と新 `payment_id` の対応ルール
- return 後の再提出を import job で検知するか、経理確認者が手動で再開するか
- Slack 通知先 channel / user group
- 月報 CSV 出力に必要な最終 field set
- 第二期で `MonthlyReports` / `MonthlyReportItems` を追加するタイミング

## 24. ADR Links

- `ADR-001-appsheet.md`: AppSheet を承認 UI として採用する判断
- `ADR-002-spreadsheet-db.md`: Google Sheets を第一期 database として使う判断
- `ADR-003-appscript-backend.md`: Apps Script を backend job 処理に限定する判断
