import React from 'react'
import { CurrencyAmount } from '@uniswap/sdk-core'

import { OrderStatus } from 'state/orders/actions'
import { EnhancedTransactionDetails } from 'state/enhancedTransactions/reducer'

import { formatSmart } from 'utils/format'
import {
  Summary,
  SummaryInner,
  SummaryInnerRow,
  TransactionAlertMessage,
  TransactionInnerDetail,
  TextAlert,
  TransactionState as ActivityLink,
  CreationTimeText,
  ActivityVisual,
} from './styled'

import { getLimitPrice, getExecutionPrice } from 'state/orders/utils'
import { DEFAULT_PRECISION } from 'constants/index'
import { ActivityDerivedState } from './index'
import { GnosisSafeLink } from './StatusDetails'
import CurrencyLogo from 'components/CurrencyLogo'
import AttentionIcon from 'assets/cow-swap/attention.svg'
import { useToken } from 'hooks/Tokens'
import SVG from 'react-inlinesvg'

const DEFAULT_ORDER_SUMMARY = {
  from: '',
  to: '',
  limitPrice: '',
  validTo: '',
}

function unfillableAlert(): JSX.Element {
  return (
    <>
      <TransactionAlertMessage type="attention">
        <SVG src={AttentionIcon} description="Limit Price Warning" />
        <b>Limit price out of range:</b>&nbsp;Wait for a matching price or cancel your order.
      </TransactionAlertMessage>
    </>
  )
}

function GnosisSafeTxDetails(props: {
  enhancedTransaction: EnhancedTransactionDetails | null
  gnosisSafeThreshold: number
  chainId: number
}): JSX.Element | null {
  const { enhancedTransaction, gnosisSafeThreshold, chainId } = props

  if (!enhancedTransaction || !enhancedTransaction.safeTransaction) {
    return null
  }

  const { confirmations, nonce } = enhancedTransaction.safeTransaction
  const numConfirmations = confirmations?.length ?? 0
  const pendingSignaturesCount = gnosisSafeThreshold - numConfirmations
  const isPendingSignatures = pendingSignaturesCount > 0

  return (
    <TransactionInnerDetail>
      <span>
        Safe Nonce: <b>{nonce}</b>
      </span>
      <span>
        Signed:{' '}
        <b>
          {numConfirmations} out of {gnosisSafeThreshold} signers
        </b>
      </span>
      {isPendingSignatures && (
        <TextAlert isPending={isPendingSignatures}>
          {pendingSignaturesCount} more signature{pendingSignaturesCount > 1 ? 's are' : ' is'} required
        </TextAlert>
      )}

      {/* View in: Gnosis Safe */}
      <GnosisSafeLink
        chainId={chainId}
        enhancedTransaction={enhancedTransaction}
        gnosisSafeThreshold={gnosisSafeThreshold}
      />
    </TransactionInnerDetail>
  )
}

interface OrderSummaryType {
  from: string | undefined
  to: string | undefined
  limitPrice: string | undefined
  executionPrice?: string | undefined
  validTo: string | undefined
  fulfillmentTime?: string | undefined
  kind?: string
}

export function ActivityDetails(props: {
  chainId: number
  activityDerivedState: ActivityDerivedState
  activityLinkUrl: string | undefined
  disableMouseActions: boolean | undefined
  creationTime?: string | undefined
}) {
  const { activityDerivedState, chainId, activityLinkUrl, disableMouseActions, creationTime } = props
  const { id, isOrder, summary, order, enhancedTransaction, isCancelled, isExpired, isUnfillable, gnosisSafeInfo } =
    activityDerivedState
  const approvalToken = useToken(enhancedTransaction?.approval?.tokenAddress) || null

  if (!order && !enhancedTransaction) return null

  // Order Summary default object
  let orderSummary: OrderSummaryType
  if (order) {
    const { inputToken, sellAmount, feeAmount, outputToken, buyAmount, validTo, kind, fulfillmentTime } = order

    const sellAmt = CurrencyAmount.fromRawAmount(inputToken, sellAmount.toString())
    const feeAmt = CurrencyAmount.fromRawAmount(inputToken, feeAmount.toString())
    const outputAmount = CurrencyAmount.fromRawAmount(outputToken, buyAmount.toString())
    const sellTokenDecimals = order?.inputToken?.decimals ?? DEFAULT_PRECISION
    const buyTokenDecimals = order?.outputToken?.decimals ?? DEFAULT_PRECISION

    const limitPrice = formatSmart(
      getLimitPrice({
        buyAmount: order.buyAmount.toString(),
        sellAmount: order.sellAmount.toString(),
        buyTokenDecimals,
        sellTokenDecimals,
        inverted: true, // TODO: handle invert price
      })
    )

    let executionPrice: string | undefined
    if (order.apiAdditionalInfo && order.status === OrderStatus.FULFILLED) {
      const { executedSellAmountBeforeFees, executedBuyAmount } = order.apiAdditionalInfo
      executionPrice = formatSmart(
        getExecutionPrice({
          executedSellAmountBeforeFees,
          executedBuyAmount,
          buyTokenDecimals,
          sellTokenDecimals,
          inverted: true, // TODO: Handle invert price
        })
      )
    }

    const getPriceFormat = (price: string): string => {
      return `${price} ${sellAmt.currency.symbol} per ${outputAmount.currency.symbol}`
    }

    const DateFormatOptions: Intl.DateTimeFormatOptions = {
      dateStyle: 'medium',
      timeStyle: 'short',
    }

    orderSummary = {
      ...DEFAULT_ORDER_SUMMARY,
      from: `${formatSmart(sellAmt.add(feeAmt))} ${sellAmt.currency.symbol}`,
      to: `${formatSmart(outputAmount)} ${outputAmount.currency.symbol}`,
      limitPrice: limitPrice && getPriceFormat(limitPrice),
      executionPrice: executionPrice && getPriceFormat(executionPrice),
      validTo: validTo ? new Date((validTo as number) * 1000).toLocaleString(undefined, DateFormatOptions) : undefined,
      fulfillmentTime: fulfillmentTime
        ? new Date(fulfillmentTime).toLocaleString(undefined, DateFormatOptions)
        : undefined,
      kind: kind.toString(),
    }
  } else {
    orderSummary = DEFAULT_ORDER_SUMMARY
  }

  const { kind, from, to, executionPrice, limitPrice, fulfillmentTime, validTo } = orderSummary
  const activityName = isOrder ? `${kind} order` : 'Transaction'
  const inputToken = activityDerivedState?.order?.inputToken || null
  const outputToken = activityDerivedState?.order?.outputToken || null

  return (
    <Summary>
      <span>
        {creationTime && <CreationTimeText>{creationTime}</CreationTimeText>}

        {/* Token Approval Currency Logo */}
        {!isOrder && approvalToken && (
          <ActivityVisual>
            <CurrencyLogo currency={approvalToken} size={'24px'} />
          </ActivityVisual>
        )}

        {/* Order Currency Logo */}
        {inputToken && outputToken && (
          <ActivityVisual>
            <CurrencyLogo currency={inputToken} size={'24px'} />
            <CurrencyLogo currency={outputToken} size={'24px'} />
          </ActivityVisual>
        )}
      </span>
      <SummaryInner>
        <b>{activityName}</b>
        {isOrder ? (
          <>
            <SummaryInnerRow>
              <b>From{kind === 'buy' && ' at most'}</b>
              <i>{from}</i>
            </SummaryInnerRow>
            <SummaryInnerRow>
              <b>To{kind === 'sell' && ' at least'}</b>
              <i>{to}</i>
            </SummaryInnerRow>
            <SummaryInnerRow>
              {executionPrice ? (
                <>
                  {' '}
                  <b>Exec. price</b>
                  <i>{executionPrice}</i>
                </>
              ) : (
                <>
                  {' '}
                  <b>Limit price</b>
                  <i>{limitPrice}</i>
                </>
              )}
            </SummaryInnerRow>
            <SummaryInnerRow isCancelled={isCancelled} isExpired={isExpired}>
              {fulfillmentTime ? (
                <>
                  <b>Filled on</b>
                  <i>{fulfillmentTime}</i>
                </>
              ) : (
                <>
                  <b>Valid to</b>
                  <i>{validTo}</i>
                </>
              )}
            </SummaryInnerRow>
          </>
        ) : (
          summary ?? id
        )}

        {activityLinkUrl && (
          <ActivityLink href={activityLinkUrl} disableMouseActions={disableMouseActions}>
            View details ↗
          </ActivityLink>
        )}

        {isUnfillable && unfillableAlert()}

        {/* 
        TODO: Load gnosisSafeThreshold (not default!)
        `enhancedTransaction` currently returns undefined (no data yet!) 
        for regular orders done with a Safe. Only works for token approvals with a Safe. 
        */}
        {gnosisSafeInfo && enhancedTransaction?.safeTransaction && (
          <GnosisSafeTxDetails
            chainId={chainId}
            enhancedTransaction={enhancedTransaction}
            gnosisSafeThreshold={gnosisSafeInfo.threshold}
          />
        )}
      </SummaryInner>
    </Summary>
  )
}