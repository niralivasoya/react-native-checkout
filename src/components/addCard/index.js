import React, {Component} from "react";
import PropTypes from "prop-types";
import {ActivityIndicator, Platform, View, Image, TextInput, Text} from "react-native";
import _ from "lodash";
import s from "string";
import payment from "payment";
import KeyboardSpacer from "react-native-keyboard-spacer";
import {CardIOModule, CardIOUtilities} from "react-native-awesome-card-io";
import defaultStyles from "./defaultStyles.js";
import TouchableOpacity from "../common/touchableOpacity";
import {formatMonthYearExpiry} from "../../common/cardFormatting";
import ScanCard, {DefaultScanCardContainer} from "../scanCard";
import cardFront from "../../../assets/images/card_front.png";
import cardExpiry from "../../../assets/images/card_expiry.png";
import cardCvc from "../../../assets/images/card_cvc.png";

const DELAY_FOCUS = Platform.OS === 'android' ? 0 : 0
export default class AddCard extends Component {
  static propTypes = {
    addCardHandler: PropTypes.func.isRequired,
    onCardNumberBlur: PropTypes.func,
    onCardNumberFocus: PropTypes.func,
    onCvcFocus: PropTypes.func,
    onCvcBlur: PropTypes.func,
    onExpiryBlur: PropTypes.func,
    onExpiryFocus: PropTypes.func,
    onScanCardClose: PropTypes.func,
    onScanCardOpen: PropTypes.func,
    styles: PropTypes.object,
    activityIndicatorColor: PropTypes.string,
    scanCardButtonText: PropTypes.string,
    scanCardAfterScanButtonText: PropTypes.string,
    scanCardVisible: PropTypes.bool,
    addCardButtonText: PropTypes.string,
    placeholderTextColor: PropTypes.string,
    cardNumberPlaceholderText: PropTypes.string,
    expiryPlaceholderText: PropTypes.string,
    cvcPlaceholderText: PropTypes.string,
    cardNumberErrorMessage: PropTypes.string,
    expiryErrorMessage: PropTypes.string,
    cvcErrorMessage: PropTypes.string,
    scanCardContainer: PropTypes.any,
  }

  static defaultProps = {
    activityIndicatorColor: 'black',
    addCardButtonText: 'Add Card',
    scanCardAfterScanButtonText: 'Scan Again',
    scanCardButtonText: 'Scan Card',
    scanCardVisible: true,
    placeholderTextColor: '#A5A5A5',
    cardNumberPlaceholderText: '4242 4242 4242 4242',
    expiryPlaceholderText: 'MM/YY',
    cvcPlaceholderText: 'CVC',
    cardNumberErrorMessage: 'Card Number is incorrect',
    expiryErrorMessage: 'Expiry is incorrect',
    cvcErrorMessage: 'CVC is incorrect',
    scanCardContainer: DefaultScanCardContainer,
  }

  constructor(props) {
    super(props)
    this.state = {
      addingCard: false,
      cardNumberDirty: false,
      scanningCard: false,
      hasTriedScan: false,
      cardNumber: '',
      error: null,
      expiry: '',
      cvc: '',
    }
  }

  componentWillMount() {
    if (CardIOUtilities.preload) {
      CardIOUtilities.preload()
    }
  }

  // componentDidMount() {
  //     this.refs.cardNumberInput.focus()
  // }

  didScanCard(card) {
    this.setState({
      scanningCard: false,
      hasTriedScan: true,
      cardNumberDirty: true,
      cardNumber: card.cardNumber,
    })
    const expiryYear = `${card.expiryYear}`
    if (s(card.expiryMonth).length >= 2 && s(expiryYear).length >= 2) {
      this.setState({expiry: `${card.expiryMonth}/${expiryYear.slice(-2)}`, expiryDirty: true})
      _.delay(() => this.refs.cvcInput.focus(), DELAY_FOCUS)
    } else {
      _.delay(() => this.refs.expiryInput.focus(), DELAY_FOCUS)
    }
    if (this.props.onScanCardClose) {
      this.props.onScanCardClose()
    }
  }

  isCardNumberValid() {
    return payment.fns.validateCardNumber(this.state.cardNumber)
  }

  isExpiryValid() {
    return payment.fns.validateCardExpiry(this.state.expiry)
  }

  isCvcValid() {
    return payment.fns.validateCardCVC(this.state.cvc)
  }

  calculatedState() {
    const cardNumberShowError = this.state.cardNumberDirty && !this.isCardNumberValid()
    const expiryShowError = this.state.expiryDirty && !this.isExpiryValid()
    const cvcShowError = this.state.cvcDirty && !this.isCvcValid()
    let error = ''
    if (cardNumberShowError) {
      error = this.props.cardNumberErrorMessage
    } else if (expiryShowError) {
      error = this.props.expiryErrorMessage
    } else if (cvcShowError) {
      error = this.props.cvcErrorMessage
    }
    return {
      ...this.state,
      error: this.state.error || error,
      cardNumberShowError: cardNumberShowError,
      expiryShowError: expiryShowError,
      cvcShowError: cvcShowError,
      cardNumberFormatted: payment.fns.formatCardNumber(this.state.cardNumber),
    }
  }

  render() {
    const styles = _.merge({}, defaultStyles, this.props.styles)
    const calculatedState = this.calculatedState()
    const addCardContents = (
      <View style={{flex:1, backgroundColor:'#fff'}}>
        <View
          style={[styles.cardNumberContainer, calculatedState.cardNumberShowError && styles.invalid, {marginVertical: 10}]}>
          <TextInput
            ref="cardNumberInput"
            keyboardType="numeric"
            underlineColorAndroid="transparent"
            style={[styles.cardNumberInput, {borderColor:'#000', borderWidth: 1, color:'gray'}]}
            placeholderTextColor={this.props.placeholderTextColor}
            onChangeText={rawCardNumber => {
              const cardNumber = s(rawCardNumber).replaceAll(' ', '').s
              this.setState({cardNumber: cardNumber})
              if (payment.fns.validateCardNumber(cardNumber)) {
                this.refs.expiryInput.focus()
              }
            }}
            value={calculatedState.cardNumberFormatted}
            placeholder={this.props.cardNumberPlaceholderText}
            onFocus={() => this.props.onCardNumberFocus && this.props.onCardNumberFocus(calculatedState.cardNumber)}
            onBlur={() => {
              if (this.props.onCardNumberBlur) {
                this.props.onCardNumberBlur(calculatedState.cardNumber)
              }
              this.setState({cardNumberDirty: true})
            }}
          />
        </View>
        <View style={styles.monthYearCvcContainer}>
          <View
            style={[styles.monthYearContainer, calculatedState.expiryShowError && styles.invalid, {marginRight: 5}]}>
            <TextInput
              ref="expiryInput"
              maxLength={5}
              keyboardType="numeric"
              underlineColorAndroid="transparent"
              style={[styles.monthYearTextInput, {borderColor:'#000', borderWidth: 1}]}
              placeholderTextColor={this.props.placeholderTextColor}
              onChangeText={expiry => {
                const newExpiry = formatMonthYearExpiry(expiry, calculatedState.expiry)
                this.setState({expiry: newExpiry})
                if (_.size(newExpiry) === 5) {
                  if (payment.fns.validateCardExpiry(newExpiry)) {
                    this.refs.cvcInput.focus()
                  } else {
                    this.setState({expiryDirty: true})
                  }
                }
              }}
              value={calculatedState.expiry}
              placeholder={this.props.expiryPlaceholderText}
              onFocus={() => this.props.onExpiryFocus && this.props.onExpiryFocus(calculatedState.expiry)}
              onBlur={() => {
                this.setState({expiryDirty: true})
                if (this.props.onExpiryBlur) {
                  this.props.onExpiryBlur(calculatedState.expiry)
                }
              }}
            />
          </View>
          <View style={[styles.cvcContainer, calculatedState.cvcShowError && styles.invalid,]}>
            <TextInput
              ref="cvcInput"
              keyboardType="numeric"
              underlineColorAndroid="transparent"
              style={[styles.cvcInput,{borderColor:'#000', borderWidth: 1}]}
              placeholderTextColor={this.props.placeholderTextColor}
              onChangeText={cvc => this.setState({cvc})}
              value={calculatedState.cvc}
              placeholder={this.props.cvcPlaceholderText}
              onFocus={() => this.props.onCvcFocus && this.props.onCvcFocus(calculatedState.cvc)}
              onBlur={() => {
                this.setState({cvcDirty: true})
                if (this.props.onCvcBlur) {
                  this.props.onCvcBlur(calculatedState.cvc)
                }
              }}
            />
          </View>
        </View>
      </View>
    )
    return (
      <View style={{flex: 1, justifyContent:"flex-start"}}>
        <View style={[styles.addCardContainer, this.props.style]}>{addCardContents}</View>
        {Platform.OS === 'android' ? null : <KeyboardSpacer /> /* Android takes care of this for us. */}
      </View>
    )
  }
}
