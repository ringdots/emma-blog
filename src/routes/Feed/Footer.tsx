import { CONFIG } from "site.config"
import React from "react"
import styled from "@emotion/styled"

const d = new Date()
const y = d.getFullYear()
const from = +CONFIG.since

type Props = {
  className?: string
}

const Footer: React.FC<Props> = ({ className }) => {
  const copyright = `© ${CONFIG.profile.name} ${
    from === y || !from ? y : `${from} - ${y}`
  }`
  return (
    <StyledWrapper className={className}>
      {CONFIG.profile.github ? (
        <a
          href={`https://github.com/${CONFIG.profile.github}`}
          target="_blank"
          rel="noreferrer"
        >
          {copyright}
        </a>
      ) : (
        <span>{copyright}</span>
      )}
    </StyledWrapper>
  )
}

export default Footer

const StyledWrapper = styled.div`
  a {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: ${({ theme }) => theme.colors.gray10};
  }
`
